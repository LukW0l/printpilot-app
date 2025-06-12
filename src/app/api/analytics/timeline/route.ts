import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const grouping = searchParams.get('grouping') || 'monthly'
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    // Validate date range
    if (!dateFrom || !dateTo) {
      return NextResponse.json({
        error: 'Date range is required'
      }, { status: 400 })
    }

    const startDate = new Date(dateFrom)
    const endDate = new Date(dateTo)

    // Get all orders in date range
    const orders = await prisma.orders.findMany({
      where: {
        orderDate: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        order_items: {
          select: {
            name: true,
            quantity: true,
            price: true
          }
        }
      },
      orderBy: {
        orderDate: 'asc'
      }
    })

    // Generate periods based on grouping
    const periods = generatePeriods(startDate, endDate, grouping)
    
    // Group orders by periods
    const groupedData = periods.map(period => {
      const periodOrders = orders.filter(order => {
        const orderDate = new Date(order.orderDate)
        return orderDate >= period.start && orderDate <= period.end
      })

      const revenue = periodOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0)
      const items = periodOrders.reduce((sum, order) => sum + order.order_items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0)
      const customers = new Set(periodOrders.map(order => order.customerEmail)).size

      // Calculate status breakdown
      const statusBreakdown = {
        NEW: periodOrders.filter(o => o.status === 'NEW').length,
        PROCESSING: periodOrders.filter(o => o.status === 'PROCESSING').length,
        PRINTED: periodOrders.filter(o => o.status === 'PRINTED').length,
        SHIPPED: periodOrders.filter(o => o.status === 'SHIPPED').length,
        DELIVERED: periodOrders.filter(o => o.status === 'DELIVERED').length,
        CANCELLED: periodOrders.filter(o => o.status === 'CANCELLED').length,
      }

      // Calculate top products
      const productStats: { [key: string]: { quantity: number, revenue: number } } = {}
      periodOrders.forEach(order => {
        order.order_items.forEach(item => {
          if (!productStats[item.name]) {
            productStats[item.name] = { quantity: 0, revenue: 0 }
          }
          productStats[item.name].quantity += item.quantity
          productStats[item.name].revenue += Number(item.price) * item.quantity
        })
      })

      const topProducts = Object.entries(productStats)
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10)

      return {
        key: period.key,
        label: period.label,
        startDate: period.start.toISOString().split('T')[0],
        endDate: period.end.toISOString().split('T')[0],
        orders: periodOrders.length,
        revenue,
        averageOrderValue: periodOrders.length > 0 ? revenue / periodOrders.length : 0,
        items,
        customers,
        growth: {
          orders: 0, // Will be calculated later
          revenue: 0  // Will be calculated later
        },
        topProducts,
        statusBreakdown
      }
    })

    // Calculate growth rates
    for (let i = 1; i < groupedData.length; i++) {
      const current = groupedData[i]
      const previous = groupedData[i - 1]
      
      if (previous.orders > 0) {
        current.growth.orders = ((current.orders - previous.orders) / previous.orders) * 100
      }
      
      if (previous.revenue > 0) {
        current.growth.revenue = ((current.revenue - previous.revenue) / previous.revenue) * 100
      }
    }

    // Calculate summary statistics
    const totalOrders = groupedData.reduce((sum, period) => sum + period.orders, 0)
    const totalRevenue = groupedData.reduce((sum, period) => sum + period.revenue, 0)
    const totalCustomers = new Set(orders.map(order => order.customerEmail)).size
    
    const periodsWithData = groupedData.filter(p => p.orders > 0)
    const bestPeriod = periodsWithData.length > 0 
      ? periodsWithData.reduce((best, current) => current.orders > best.orders ? current : best).label
      : 'Brak danych'
    
    const worstPeriod = periodsWithData.length > 0
      ? periodsWithData.reduce((worst, current) => current.orders < worst.orders ? current : worst).label
      : 'Brak danych'

    const summary = {
      totalOrders,
      totalRevenue,
      totalCustomers,
      averageOrdersPerPeriod: groupedData.length > 0 ? totalOrders / groupedData.length : 0,
      averageRevenuePerPeriod: groupedData.length > 0 ? totalRevenue / groupedData.length : 0,
      bestPeriod,
      worstPeriod
    }

    return NextResponse.json({
      success: true,
      data: {
        periods: groupedData,
        summary
      }
    })

  } catch (error) {
    console.error('Error in timeline analytics:', error)
    return NextResponse.json({
      error: 'Failed to generate timeline analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function generatePeriods(startDate: Date, endDate: Date, grouping: string) {
  const periods = []
  let current = new Date(startDate)
  
  while (current <= endDate) {
    let periodStart = new Date(current)
    let periodEnd: Date
    let key: string
    let label: string

    switch (grouping) {
      case 'daily':
        periodEnd = new Date(current)
        periodEnd.setHours(23, 59, 59, 999)
        key = current.toISOString().split('T')[0]
        label = current.toLocaleDateString('pl-PL')
        current.setDate(current.getDate() + 1)
        break

      case 'weekly':
        // Start from Monday
        const dayOfWeek = current.getDay()
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
        periodStart = new Date(current)
        periodStart.setDate(current.getDate() + mondayOffset)
        periodStart.setHours(0, 0, 0, 0)
        
        periodEnd = new Date(periodStart)
        periodEnd.setDate(periodStart.getDate() + 6)
        periodEnd.setHours(23, 59, 59, 999)
        
        key = `${periodStart.getFullYear()}-W${getWeekNumber(periodStart)}`
        label = `Tydzień ${getWeekNumber(periodStart)} ${periodStart.getFullYear()}`
        
        current = new Date(periodEnd)
        current.setDate(current.getDate() + 1)
        break

      case 'monthly':
        periodStart.setDate(1)
        periodStart.setHours(0, 0, 0, 0)
        
        periodEnd = new Date(periodStart)
        periodEnd.setMonth(periodEnd.getMonth() + 1)
        periodEnd.setDate(0)
        periodEnd.setHours(23, 59, 59, 999)
        
        key = `${periodStart.getFullYear()}-${(periodStart.getMonth() + 1).toString().padStart(2, '0')}`
        label = periodStart.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })
        
        current = new Date(periodStart)
        current.setMonth(current.getMonth() + 1)
        break

      case 'quarterly':
        const quarter = Math.floor(current.getMonth() / 3)
        periodStart = new Date(current.getFullYear(), quarter * 3, 1)
        periodStart.setHours(0, 0, 0, 0)
        
        periodEnd = new Date(current.getFullYear(), quarter * 3 + 3, 0)
        periodEnd.setHours(23, 59, 59, 999)
        
        key = `${periodStart.getFullYear()}-Q${quarter + 1}`
        label = `Q${quarter + 1} ${periodStart.getFullYear()}`
        
        current = new Date(periodStart)
        current.setMonth(current.getMonth() + 3)
        break

      case 'yearly':
        periodStart = new Date(current.getFullYear(), 0, 1)
        periodStart.setHours(0, 0, 0, 0)
        
        periodEnd = new Date(current.getFullYear(), 11, 31)
        periodEnd.setHours(23, 59, 59, 999)
        
        key = periodStart.getFullYear().toString()
        label = periodStart.getFullYear().toString()
        
        current = new Date(periodStart)
        current.setFullYear(current.getFullYear() + 1)
        break

      default:
        throw new Error(`Unsupported grouping: ${grouping}`)
    }

    // Only add period if it's within our date range
    if (periodStart <= endDate) {
      periods.push({
        key,
        label,
        start: periodStart,
        end: new Date(Math.min(periodEnd.getTime(), endDate.getTime()))
      })
    }

    // Prevent infinite loop
    if (current <= periodStart) {
      break
    }
  }

  return periods
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}