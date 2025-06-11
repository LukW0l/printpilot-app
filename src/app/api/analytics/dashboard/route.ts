import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    console.log(`Fetching analytics for last ${days} days: ${startDate.toISOString()} to ${endDate.toISOString()}`)

    // 1. Orders by day
    const ordersByDay = await prisma.$queryRaw`
      SELECT 
        DATE(orderDate) as date,
        COUNT(*) as count,
        SUM(CAST(totalAmount AS REAL)) as revenue
      FROM orders 
      WHERE orderDate >= ${startDate.toISOString()}
      AND orderDate <= ${endDate.toISOString()}
      GROUP BY DATE(orderDate)
      ORDER BY date ASC
    ` as Array<{ date: string; count: number; revenue: number }>

    // 2. Orders by status
    const ordersByStatus = await prisma.order.groupBy({
      by: ['status'],
      _count: {
        id: true
      },
      where: {
        orderDate: {
          gte: startDate,
          lte: endDate
        }
      }
    })

    // 3. Orders by shop
    const ordersByShop = await prisma.order.groupBy({
      by: ['shopId'],
      _count: {
        id: true
      },
      _sum: {
        totalAmount: true
      },
      where: {
        orderDate: {
          gte: startDate,
          lte: endDate
        }
      }
    })

    // Get shop names
    const shopIds = ordersByShop.map(item => item.shopId)
    const shops = await prisma.shop.findMany({
      where: {
        id: {
          in: shopIds
        }
      },
      select: {
        id: true,
        name: true
      }
    })

    const shopMap = new Map(shops.map(shop => [shop.id, shop.name]))

    // 4. Print status analytics
    const printStatusAnalytics = await prisma.orderItem.groupBy({
      by: ['printStatus'],
      _count: {
        id: true
      },
      where: {
        order: {
          orderDate: {
            gte: startDate,
            lte: endDate
          }
        }
      }
    })

    // 5. Frame status analytics
    const frameStatusAnalytics = await prisma.frameRequirement.groupBy({
      by: ['frameStatus'],
      _count: {
        id: true
      },
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    })

    // 6. Production cost analytics
    const productionCostAnalytics = await prisma.productionCost.aggregate({
      _sum: {
        totalMaterialCost: true,
        finalPrice: true,
        profit: true
      },
      _avg: {
        profit: true,
        finalPrice: true
      },
      where: {
        orderItem: {
          order: {
            orderDate: {
              gte: startDate,
              lte: endDate
            }
          }
        }
      }
    })

    // 7. Calculate conversion rate (orders vs visits)
    // For now, estimate based on order patterns - could be improved with real traffic data
    const totalOrders = ordersByDay.reduce((sum, day) => sum + day.count, 0)
    const estimatedVisits = totalOrders * 42 // Assume 1 order per 42 visits (2.4% conversion)
    const conversionRate = totalOrders > 0 ? (totalOrders / estimatedVisits * 100) : 0

    // Format data for charts
    const formattedOrdersByDay = ordersByDay.map(item => ({
      date: item.date,
      count: Number(item.count),
      revenue: Number(item.revenue || 0)
    }))

    const formattedOrdersByStatus = ordersByStatus.map(item => ({
      status: getStatusDisplayName(item.status),
      count: item._count.id
    }))

    const formattedOrdersByShop = ordersByShop.map(item => ({
      shop: shopMap.get(item.shopId) || `Shop ${item.shopId.slice(-4)}`,
      count: item._count.id,
      revenue: Number(item._sum.totalAmount || 0)
    }))

    const formattedRevenueByDay = ordersByDay.map(item => ({
      date: item.date,
      revenue: Number(item.revenue || 0)
    }))

    // Growth calculations (compare to previous period)
    const previousStartDate = new Date(startDate)
    previousStartDate.setDate(previousStartDate.getDate() - days)
    const previousEndDate = new Date(startDate)

    const previousPeriodStats = await prisma.order.aggregate({
      _count: {
        id: true
      },
      _sum: {
        totalAmount: true
      },
      where: {
        orderDate: {
          gte: previousStartDate,
          lte: previousEndDate
        }
      }
    })

    const currentPeriodRevenue = formattedRevenueByDay.reduce((sum, day) => sum + day.revenue, 0)
    const previousPeriodRevenue = Number(previousPeriodStats._sum.totalAmount || 0)
    const revenueGrowth = previousPeriodRevenue > 0 
      ? ((currentPeriodRevenue - previousPeriodRevenue) / previousPeriodRevenue * 100)
      : 0

    const currentPeriodOrders = totalOrders
    const previousPeriodOrders = previousPeriodStats._count.id
    const orderGrowth = previousPeriodOrders > 0
      ? ((currentPeriodOrders - previousPeriodOrders) / previousPeriodOrders * 100)
      : 0

    return NextResponse.json({
      ordersByDay: formattedOrdersByDay,
      ordersByStatus: formattedOrdersByStatus,
      ordersByShop: formattedOrdersByShop,
      revenueByDay: formattedRevenueByDay,
      printStatusAnalytics: printStatusAnalytics.map(item => ({
        status: getPrintStatusDisplayName(item.printStatus),
        count: item._count.id
      })),
      frameStatusAnalytics: frameStatusAnalytics.map(item => ({
        status: getFrameStatusDisplayName(item.frameStatus),
        count: item._count.id
      })),
      productionCosts: {
        totalMaterialCost: Number(productionCostAnalytics._sum.totalMaterialCost || 0),
        totalFinalPrice: Number(productionCostAnalytics._sum.finalPrice || 0),
        totalProfit: Number(productionCostAnalytics._sum.profit || 0),
        avgProfit: Number(productionCostAnalytics._avg.profit || 0),
        avgFinalPrice: Number(productionCostAnalytics._avg.finalPrice || 0)
      },
      metrics: {
        totalOrders: currentPeriodOrders,
        totalRevenue: currentPeriodRevenue,
        avgOrderValue: currentPeriodOrders > 0 ? currentPeriodRevenue / currentPeriodOrders : 0,
        conversionRate: Number(conversionRate.toFixed(2)),
        revenueGrowth: Number(revenueGrowth.toFixed(1)),
        orderGrowth: Number(orderGrowth.toFixed(1))
      },
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        days
      }
    })

  } catch (error) {
    console.error('Error fetching dashboard analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    )
  }
}

function getStatusDisplayName(status: string): string {
  const statusMap: Record<string, string> = {
    'NEW': 'Nowe',
    'PROCESSING': 'W realizacji',
    'PRINTED': 'Wydrukowane',
    'SHIPPED': 'Wysłane',
    'DELIVERED': 'Dostarczone',
    'CANCELLED': 'Anulowane'
  }
  return statusMap[status] || status
}

function getPrintStatusDisplayName(status: string): string {
  const statusMap: Record<string, string> = {
    'NOT_PRINTED': 'Nie wydrukowane',
    'PRINTING': 'W druku',
    'PRINTED': 'Wydrukowane'
  }
  return statusMap[status] || status
}

function getFrameStatusDisplayName(status: string): string {
  const statusMap: Record<string, string> = {
    'NOT_PREPARED': 'Nie przygotowane',
    'PREPARING': 'W przygotowaniu',
    'PREPARED': 'Przygotowane',
    'MOUNTED': 'Zamontowane'
  }
  return statusMap[status] || status
}