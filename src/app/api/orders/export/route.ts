import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Parser } from 'json2csv'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'csv'
    const status = searchParams.get('status')
    const shopId = searchParams.get('shopId')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    // Build query
    const where: any = {}
    if (status) where.status = status
    if (shopId) where.shopId = shopId
    if (dateFrom || dateTo) {
      where.orderDate = {}
      if (dateFrom) where.orderDate.gte = new Date(dateFrom)
      if (dateTo) where.orderDate.lte = new Date(dateTo)
    }

    // Fetch orders
    const orders = await prisma.order.findMany({
      where,
      include: {
        shop: true,
        items: true
      },
      orderBy: {
        orderDate: 'desc'
      }
    })

    if (format === 'csv') {
      // Prepare data for CSV
      const csvData = orders.map(order => ({
        'Order ID': order.externalId,
        'Shop': order.shop.name,
        'Customer Name': order.customerName,
        'Customer Email': order.customerEmail,
        'Customer Phone': order.customerPhone || '',
        'Status': order.status,
        'Total Amount': order.totalAmount.toString(),
        'Currency': order.currency,
        'Order Date': order.orderDate.toISOString(),
        'Tracking Number': order.trackingNumber || '',
        'Shipping Provider': order.shippingProvider || '',
        'Items Count': order.items.length,
        'Shipping Address': typeof order.shippingAddress === 'string' 
          ? order.shippingAddress 
          : order.shippingAddress 
            ? `${(order.shippingAddress as any).street || ''}, ${(order.shippingAddress as any).city || ''}, ${(order.shippingAddress as any).postalCode || ''}, ${(order.shippingAddress as any).country || ''}`.replace(/^,\s*|,\s*$/g, '')
            : ''
      }))

      const parser = new Parser()
      const csv = parser.parse(csvData)

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="orders-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    } else if (format === 'json') {
      return NextResponse.json(orders, {
        headers: {
          'Content-Disposition': `attachment; filename="orders-${new Date().toISOString().split('T')[0]}.json"`
        }
      })
    } else {
      return NextResponse.json(
        { error: 'Invalid format. Use csv or json' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Failed to export orders' },
      { status: 500 }
    )
  }
}