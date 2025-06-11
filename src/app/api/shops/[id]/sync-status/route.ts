import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import axios from 'axios'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Get shop details
    const shop = await prisma.shop.findUnique({
      where: { id },
      include: {
        _count: {
          select: { orders: true }
        }
      }
    })

    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }

    // Get latest sync log
    const latestSync = await prisma.syncLog.findFirst({
      where: { shopId: id },
      orderBy: { startedAt: 'desc' }
    })

    // Get WooCommerce order count
    let wooCommerceOrderCount = 0
    let wooCommerceError = null

    if (shop.apiKey && shop.apiSecret) {
      try {
        const apiUrl = `${shop.url}/wp-json/wc/v3/orders`
        const response = await axios.get(apiUrl, {
          auth: {
            username: shop.apiKey,
            password: shop.apiSecret
          },
          params: {
            per_page: 1,
            status: 'any'
          },
          timeout: 10000
        })

        // Get total count from headers
        wooCommerceOrderCount = parseInt(response.headers['x-wp-total'] || '0')
      } catch (error: any) {
        wooCommerceError = error.message
        console.error('Error fetching WooCommerce order count:', error.message)
      }
    }

    return NextResponse.json({
      shop: {
        id: shop.id,
        name: shop.name,
        url: shop.url,
        platform: shop.platform,
        isActive: shop.isActive
      },
      counts: {
        database: shop._count.orders,
        woocommerce: wooCommerceOrderCount,
        difference: wooCommerceOrderCount - shop._count.orders
      },
      lastSync: latestSync ? {
        id: latestSync.id,
        status: latestSync.status,
        startedAt: latestSync.startedAt,
        finishedAt: latestSync.finishedAt,
        duration: latestSync.duration,
        totalOrders: latestSync.totalOrders,
        newOrders: latestSync.newOrders,
        updatedOrders: latestSync.updatedOrders,
        failedOrders: latestSync.failedOrders,
        apiOrderCount: latestSync.apiOrderCount,
        errorMessage: latestSync.errorMessage
      } : null,
      errors: {
        woocommerce: wooCommerceError
      }
    })
  } catch (error) {
    console.error('Error fetching sync status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sync status' },
      { status: 500 }
    )
  }
}