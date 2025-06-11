import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const days = searchParams.get('days')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const status = searchParams.get('status')
    const shopId = searchParams.get('shopId')
    
    console.log('Stats API received params:', {
      days, dateFrom, dateTo, status, shopId,
      url: request.url
    })

    // Build where clause for date filtering (same logic as orders API)
    const now = new Date()
    let dateFilter: any = {}

    if (days) {
      // Quick filter: last N days
      const daysAgo = new Date()
      daysAgo.setDate(now.getDate() - parseInt(days))
      dateFilter = {
        orderDate: {
          gte: daysAgo,
          lte: now
        }
      }
    } else if (dateFrom || dateTo) {
      // Custom date range
      if (dateFrom && dateTo) {
        dateFilter = {
          orderDate: {
            gte: new Date(dateFrom),
            lte: new Date(dateTo)
          }
        }
      } else if (dateFrom) {
        dateFilter = {
          orderDate: {
            gte: new Date(dateFrom)
          }
        }
      } else if (dateTo) {
        dateFilter = {
          orderDate: {
            lte: new Date(dateTo)
          }
        }
      }
    } else {
      // Default: last 30 days (only if no explicit "all" parameter)
      const showAll = searchParams.get('all')
      if (!showAll) {
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(now.getDate() - 30)
        dateFilter = {
          orderDate: {
            gte: thirtyDaysAgo,
            lte: now
          }
        }
      }
    }

    // Build base where clause
    const baseWhere: any = {}
    if (Object.keys(dateFilter).length > 0) {
      Object.assign(baseWhere, dateFilter)
    }
    if (shopId) baseWhere.shopId = shopId

    // Get total counts by status with date filter
    const totalCount = await prisma.order.count({ where: baseWhere })
    const newCount = await prisma.order.count({ where: { ...baseWhere, status: 'NEW' } })
    const processingCount = await prisma.order.count({ where: { ...baseWhere, status: 'PROCESSING' } })
    const printedCount = await prisma.order.count({ where: { ...baseWhere, status: 'PRINTED' } })
    const shippedCount = await prisma.order.count({ 
      where: { 
        ...baseWhere, 
        status: { in: ['SHIPPED', 'DELIVERED'] } 
      } 
    })
    const deliveredCount = await prisma.order.count({ where: { ...baseWhere, status: 'DELIVERED' } })

    // Calculate total revenue with date filter
    const revenueResult = await prisma.order.aggregate({
      _sum: {
        totalAmount: true
      },
      where: baseWhere
    })

    // Get additional useful stats - but respect existing date filters
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    
    // For today orders, combine with existing date filter
    const todayWhere = { ...baseWhere }
    if (todayWhere.orderDate) {
      // If there's already a date filter, intersect it with today's range
      todayWhere.orderDate = {
        ...todayWhere.orderDate,
        gte: todayStart > new Date(todayWhere.orderDate.gte || '2020-01-01') ? todayStart : new Date(todayWhere.orderDate.gte || '2020-01-01')
      }
    } else {
      todayWhere.orderDate = { gte: todayStart }
    }
    
    const todayOrders = await prisma.order.count({ where: todayWhere })

    const thisWeekStart = new Date()
    thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay())
    thisWeekStart.setHours(0, 0, 0, 0)
    
    // For week orders, combine with existing date filter
    const weekWhere = { ...baseWhere }
    if (weekWhere.orderDate) {
      weekWhere.orderDate = {
        ...weekWhere.orderDate,
        gte: thisWeekStart > new Date(weekWhere.orderDate.gte || '2020-01-01') ? thisWeekStart : new Date(weekWhere.orderDate.gte || '2020-01-01')
      }
    } else {
      weekWhere.orderDate = { gte: thisWeekStart }
    }
    
    const thisWeekOrders = await prisma.order.count({ where: weekWhere })

    // Print status stats - get items from orders that match the filter
    const filteredOrderIds = Object.keys(baseWhere).length > 0 
      ? (await prisma.order.findMany({
          where: baseWhere,
          select: { id: true }
        })).map(order => order.id)
      : undefined

    const itemWhere = filteredOrderIds 
      ? { orderId: { in: filteredOrderIds } }
      : {}

    const printedItems = await prisma.orderItem.count({
      where: { ...itemWhere, printStatus: 'PRINTED' }
    })
    
    const printingItems = await prisma.orderItem.count({
      where: { ...itemWhere, printStatus: 'PRINTING' }
    })
    
    const notPrintedItems = await prisma.orderItem.count({
      where: { ...itemWhere, printStatus: 'NOT_PRINTED' }
    })

    return NextResponse.json({
      orders: {
        total: totalCount,
        new: newCount,
        processing: processingCount,
        printed: printedCount,
        shipped: shippedCount,
        delivered: deliveredCount,
        todayOrders,
        thisWeekOrders
      },
      revenue: {
        total: revenueResult._sum.totalAmount || 0,
        currency: 'PLN'
      },
      production: {
        printed: printedItems,
        printing: printingItems,
        notPrinted: notPrintedItems,
        total: printedItems + printingItems + notPrintedItems
      }
    })
  } catch (error) {
    console.error('Error fetching order stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch order statistics' },
      { status: 500 }
    )
  }
}