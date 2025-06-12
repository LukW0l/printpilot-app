import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Temporarily disabled auth for testing
    // const session = await getServerSession(authOptions)
    // if (!session) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    // Get date range from query params or default to 30 days
    const { searchParams } = new URL(request.url)
    const days = searchParams.get('days')
    
    const endDate = new Date()
    const startDate = new Date()
    
    if (days && days !== 'null') {
      startDate.setDate(startDate.getDate() - parseInt(days))
    } else {
      // Default to last 30 days when no days parameter provided
      startDate.setDate(startDate.getDate() - 30)
    }

    // Get all orders for analytics
    const orders = await prisma.orders.findMany({
      where: {
        orderDate: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        shops: true
      }
    })

    // Orders by day
    const ordersByDay: Record<string, number> = {}
    const revenueByDay: Record<string, number> = {}
    
    orders.forEach(order => {
      const date = order.orderDate.toISOString().split('T')[0]
      ordersByDay[date] = (ordersByDay[date] || 0) + 1
      revenueByDay[date] = (revenueByDay[date] || 0) + Number(order.totalAmount)
    })

    // Orders by status
    const ordersByStatus: Record<string, number> = {}
    orders.forEach(order => {
      ordersByStatus[order.status] = (ordersByStatus[order.status] || 0) + 1
    })

    // Orders by shop
    const ordersByShop: Record<string, number> = {}
    orders.forEach(order => {
      const shopName = order.shops.name
      ordersByShop[shopName] = (ordersByShop[shopName] || 0) + 1
    })

    // Determine chart granularity based on time range
    const dayCount = days ? parseInt(days) : 9999
    let chartDays = 14 // Default for short periods
    
    if (dayCount <= 7) chartDays = dayCount
    else if (dayCount <= 30) chartDays = 14
    else if (dayCount <= 90) chartDays = 30
    else if (dayCount <= 365) chartDays = 60
    else chartDays = 90 // For all time
    
    // Format data for charts
    const analytics = {
      ordersByDay: Object.entries(ordersByDay)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      
      ordersByStatus: Object.entries(ordersByStatus)
        .map(([status, count]) => ({ status, count })),
      
      ordersByShop: Object.entries(ordersByShop)
        .map(([shop, count]) => ({ shop, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10), // Top 10 shops for longer periods
      
      revenueByDay: Object.entries(revenueByDay)
        .map(([date, revenue]) => ({ date, revenue: Math.round(revenue) }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      
      totals: {
        totalOrders: orders.length,
        totalRevenue: orders.reduce((sum, order) => sum + Number(order.totalAmount), 0),
        averageOrderValue: orders.length > 0 
          ? orders.reduce((sum, order) => sum + Number(order.totalAmount), 0) / orders.length
          : 0,
        todayOrders: orders.filter(order => 
          order.orderDate.toISOString().split('T')[0] === new Date().toISOString().split('T')[0]
        ).length
      }
    }

    return NextResponse.json(analytics)
  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}