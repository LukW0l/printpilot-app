import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'

function generateId() {
  return randomBytes(12).toString('base64url')
}

interface ProfitabilityData {
  orderId: string
  revenue: number
  shippingRevenue: number
  materialCosts: number
  frameCosts: number
  printingCosts: number
  packagingCosts: number
  laborCosts: number
  laborHours: number
  hourlyRate: number
  shippingCosts: number
  processingFees: number
  overheadCosts: number
  totalCosts: number
  grossProfit: number
  profitMargin: number
}

interface ProfitabilityInsights {
  totalOrders: number
  totalRevenue: number
  totalCosts: number
  totalProfit: number
  averageProfitMargin: number
  profitableOrders: number
  unprofitableOrders: number
  topProfitableProducts: Array<{
    productName: string
    productType: string
    frameSize: string
    orderCount: number
    totalProfit: number
    averageMargin: number
  }>
  costBreakdown: {
    materials: number
    labor: number
    shipping: number
    processing: number
    overhead: number
  }
  monthlyTrends: Array<{
    month: string
    revenue: number
    profit: number
    margin: number
  }>
}

export class ProfitabilityAnalyzer {
  
  // Oblicz rentowność konkretnego zamówienia
  async calculateOrderProfitability(orderId: string): Promise<ProfitabilityData> {
    const order = await prisma.orders.findUnique({
      where: { id: orderId },
      include: {
        order_items: {
          include: {
            production_costs: true,
            frame_requirements: true
          }
        },
        shipments: true,
        production_timers: true
      }
    })
    
    if (!order) {
      throw new Error('Order not found')
    }
    
    console.log(`💰 Calculating profitability for order ${order.externalId}`)
    
    // Pobierz konfigurację kosztów
    const config = await prisma.production_cost_config.findFirst({ where: { isActive: true } })
    const defaultHourlyRate = config?.hourlyLaborRate ? Number(config.hourlyLaborRate) : 50
    const defaultTimePerItem = config?.estimatedTimePerItem ? Number(config.estimatedTimePerItem) : 0.5
    const defaultPackagingCost = config?.packagingCostPerOrder ? Number(config.packagingCostPerOrder) : 5
    const processingFeePercent = config?.processingFeePercentage ? Number(config.processingFeePercentage) / 100 : 0.02
    const shippingCostPercent = config?.shippingCostPercentage ? Number(config.shippingCostPercentage) / 100 : 0.8

    // Przychody
    const revenue = Number(order.totalAmount)
    const shippingRevenue = Number(order.shippingCost || 0)
    
    // Koszty materiałów z ProductionCost
    let materialCosts = 0
    let frameCosts = 0
    let printingCosts = 0
    let packagingCosts = defaultPackagingCost
    
    for (const item of order.order_items) {
      if (item.production_costs) {
        materialCosts += Number(item.production_costs.canvasCost)
        frameCosts += Number(item.production_costs.stretcherCost) + 
                     Number(item.production_costs.crossbarCost) + 
                     Number(item.production_costs.cardboardCost)
        printingCosts += Number(item.production_costs.printingCost)
        packagingCosts += Number(item.production_costs.hookCost) || 0
      } else {
        // Fallback calculation jeśli brak ProductionCost
        const itemValue = Number(item.price) * item.quantity
        materialCosts += itemValue * 0.3 // 30% wartości na materiały
        frameCosts += itemValue * 0.2 // 20% na krosna
        printingCosts += itemValue * 0.15 // 15% na druk
      }
    }
    
    // Koszty pracy na podstawie ProductionTimer
    let laborHours = 0
    let laborCosts = 0
    
    for (const timer of order.production_timers) {
      if (timer.duration && timer.isCompleted) {
        const hours = timer.duration / 3600 // sekundy na godziny
        laborHours += hours
        laborCosts += hours * defaultHourlyRate
      }
    }
    
    // Jeśli brak timerów, oszacuj na podstawie liczby elementów
    if (laborHours === 0) {
      const itemCount = order.order_items.reduce((sum, item) => sum + item.quantity, 0)
      laborHours = itemCount * defaultTimePerItem
      laborCosts = laborHours * defaultHourlyRate
    }
    
    // Koszty wysyłki
    const shippingCosts = order.shipments.length > 0 ? 
      order.shipments.reduce((sum, s) => sum + Number(s.shippingCost), 0) : 
      Number(order.shippingCost || 0) * shippingCostPercent
    
    // Prowizje płatnicze
    const processingFees = revenue * processingFeePercent
    
    // Koszty ogólne (10% od przychodów)
    const overheadCosts = revenue * 0.1
    
    // Całkowite koszty
    const totalCosts = materialCosts + frameCosts + printingCosts + packagingCosts + 
                      laborCosts + shippingCosts + processingFees + overheadCosts
    
    // Zysk i marża
    const grossProfit = revenue + shippingRevenue - totalCosts
    const profitMargin = (revenue + shippingRevenue) > 0 ? (grossProfit / (revenue + shippingRevenue)) * 100 : 0
    
    const profitabilityData: ProfitabilityData = {
      orderId,
      revenue,
      shippingRevenue,
      materialCosts,
      frameCosts,
      printingCosts,
      packagingCosts,
      laborCosts,
      laborHours,
      hourlyRate: defaultHourlyRate,
      shippingCosts,
      processingFees,
      overheadCosts,
      totalCosts,
      grossProfit,
      profitMargin
    }
    
    // Zapisz do bazy danych
    await this.saveProfitabilityToDatabase(profitabilityData)
    
    console.log(`✅ Order ${order.externalId}: ${grossProfit.toFixed(2)} PLN profit (${profitMargin.toFixed(1)}% margin)`)
    
    return profitabilityData
  }
  
  // Zapisz dane rentowności do bazy
  private async saveProfitabilityToDatabase(data: ProfitabilityData): Promise<void> {
    await prisma.order_profitability.upsert({
      where: { orderId: data.orderId },
      update: {
        revenue: data.revenue,
        shippingRevenue: data.shippingRevenue,
        materialCosts: data.materialCosts,
        frameCosts: data.frameCosts,
        printingCosts: data.printingCosts,
        packagingCosts: data.packagingCosts,
        laborCosts: data.laborCosts,
        laborHours: data.laborHours,
        hourlyRate: data.hourlyRate,
        shippingCosts: data.shippingCosts,
        processingFees: data.processingFees,
        overheadCosts: data.overheadCosts,
        totalCosts: data.totalCosts,
        grossProfit: data.grossProfit,
        profitMargin: data.profitMargin,
        updatedAt: new Date()
      },
      create: {
        id: generateId(),
        orderId: data.orderId,
        revenue: data.revenue,
        shippingRevenue: data.shippingRevenue,
        materialCosts: data.materialCosts,
        frameCosts: data.frameCosts,
        printingCosts: data.printingCosts,
        packagingCosts: data.packagingCosts,
        laborCosts: data.laborCosts,
        laborHours: data.laborHours,
        hourlyRate: data.hourlyRate,
        shippingCosts: data.shippingCosts,
        processingFees: data.processingFees,
        overheadCosts: data.overheadCosts,
        totalCosts: data.totalCosts,
        grossProfit: data.grossProfit,
        profitMargin: data.profitMargin,
        updatedAt: new Date()
      }
    })
  }
  
  // Przelicz rentowność wszystkich zamówień
  async recalculateAllProfitability(days: number = 90): Promise<number> {
    const since = new Date()
    since.setDate(since.getDate() - days)
    
    const orders = await prisma.orders.findMany({
      where: {
        orderDate: { gte: since }
      },
      select: { id: true, externalId: true }
    })
    
    console.log(`🔄 Recalculating profitability for ${orders.length} orders from last ${days} days`)
    
    let processed = 0
    for (const order of orders) {
      try {
        await this.calculateOrderProfitability(order.id)
        processed++
        
        if (processed % 10 === 0) {
          console.log(`📊 Processed ${processed}/${orders.length} orders`)
        }
      } catch (error) {
        console.error(`❌ Failed to calculate profitability for order ${order.externalId}:`, error)
      }
    }
    
    console.log(`✅ Recalculated profitability for ${processed} orders`)
    return processed
  }
  
  // Analiza ogólnej rentowności
  async getProfitabilityInsights(days: number = 30): Promise<ProfitabilityInsights> {
    const since = new Date()
    since.setDate(since.getDate() - days)
    
    const profitabilityData = await prisma.order_profitability.findMany({
      where: {
        orders: {
          orderDate: { gte: since }
        }
      },
      include: {
        orders: {
          include: {
            order_items: {
              include: {
                frame_requirements: true
              }
            }
          }
        }
      }
    })
    
    const insights: ProfitabilityInsights = {
      totalOrders: profitabilityData.length,
      totalRevenue: 0,
      totalCosts: 0,
      totalProfit: 0,
      averageProfitMargin: 0,
      profitableOrders: 0,
      unprofitableOrders: 0,
      topProfitableProducts: [],
      costBreakdown: {
        materials: 0,
        labor: 0,
        shipping: 0,
        processing: 0,
        overhead: 0
      },
      monthlyTrends: []
    }
    
    if (profitabilityData.length === 0) {
      return insights
    }
    
    // Podstawowe statystyki
    for (const data of profitabilityData) {
      insights.totalRevenue += Number(data.revenue) + Number(data.shippingRevenue)
      insights.totalCosts += Number(data.totalCosts)
      insights.totalProfit += Number(data.grossProfit)
      
      if (Number(data.grossProfit) > 0) {
        insights.profitableOrders++
      } else {
        insights.unprofitableOrders++
      }
      
      // Rozkład kosztów
      insights.costBreakdown.materials += Number(data.materialCosts) + Number(data.frameCosts) + Number(data.printingCosts)
      insights.costBreakdown.labor += Number(data.laborCosts)
      insights.costBreakdown.shipping += Number(data.shippingCosts)
      insights.costBreakdown.processing += Number(data.processingFees)
      insights.costBreakdown.overhead += Number(data.overheadCosts)
    }
    
    insights.averageProfitMargin = insights.totalRevenue > 0 ? 
      (insights.totalProfit / insights.totalRevenue) * 100 : 0
    
    // Analiza produktów
    const productStats = new Map<string, {
      orderCount: number
      totalProfit: number
      totalRevenue: number
    }>()
    
    for (const data of profitabilityData) {
      for (const item of data.orders.order_items) {
        // Użyj nazwy produktu jako klucza, z wymiarami jako dodatkowym kontekstem
        const productKey = item.name || 'Produkt bez nazwy'
        
        if (!productStats.has(productKey)) {
          productStats.set(productKey, {
            orderCount: 0,
            totalProfit: 0,
            totalRevenue: 0
          })
        }
        
        const stats = productStats.get(productKey)!
        stats.orderCount++
        stats.totalProfit += Number(data.grossProfit) / data.orders.order_items.length // Podziel zysk między produkty
        stats.totalRevenue += Number(data.revenue) / data.orders.order_items.length
      }
    }
    
    // Top 10 najrentowniejszych produktów
    insights.topProfitableProducts = Array.from(productStats.entries())
      .map(([productName, stats]) => {
        return {
          productName,
          productType: 'Obraz', // Domyślny typ
          frameSize: '', // Nie używamy już frameSize jako osobnego pola
          orderCount: stats.orderCount,
          totalProfit: stats.totalProfit,
          averageMargin: stats.totalRevenue > 0 ? (stats.totalProfit / stats.totalRevenue) * 100 : 0
        }
      })
      .sort((a, b) => b.totalProfit - a.totalProfit)
      .slice(0, 10)
    
    // Trendy miesięczne
    const monthlyStats = new Map<string, {
      revenue: number
      profit: number
    }>()
    
    for (const data of profitabilityData) {
      const monthKey = data.orders.orderDate.toISOString().slice(0, 7) // YYYY-MM
      
      if (!monthlyStats.has(monthKey)) {
        monthlyStats.set(monthKey, { revenue: 0, profit: 0 })
      }
      
      const stats = monthlyStats.get(monthKey)!
      stats.revenue += Number(data.revenue) + Number(data.shippingRevenue)
      stats.profit += Number(data.grossProfit)
    }
    
    insights.monthlyTrends = Array.from(monthlyStats.entries())
      .map(([month, stats]) => ({
        month,
        revenue: stats.revenue,
        profit: stats.profit,
        margin: stats.revenue > 0 ? (stats.profit / stats.revenue) * 100 : 0
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
    
    return insights
  }
  
  // Znajdź najmniej rentowne zamówienia
  async getLeastProfitableOrders(limit: number = 10): Promise<Array<{
    orderId: string
    externalId: string
    profit: number
    margin: number
    revenue: number
    totalCosts: number
    orderDate: Date
  }>> {
    const unprofitable = await prisma.order_profitability.findMany({
      where: {
        grossProfit: { lt: 0 }
      },
      include: {
        orders: true
      },
      orderBy: {
        grossProfit: 'asc'
      },
      take: limit
    })
    
    return unprofitable.map(p => ({
      orderId: p.orderId,
      externalId: p.orders.externalId,
      profit: Number(p.grossProfit),
      margin: p.profitMargin,
      revenue: Number(p.revenue) + Number(p.shippingRevenue),
      totalCosts: Number(p.totalCosts),
      orderDate: p.orders.orderDate
    }))
  }
  
  // Znajdź najbardziej rentowne zamówienia
  async getMostProfitableOrders(limit: number = 10): Promise<Array<{
    orderId: string
    externalId: string
    profit: number
    margin: number
    revenue: number
    totalCosts: number
    orderDate: Date
  }>> {
    const profitable = await prisma.order_profitability.findMany({
      where: {
        grossProfit: { gt: 0 }
      },
      include: {
        orders: true
      },
      orderBy: {
        grossProfit: 'desc'
      },
      take: limit
    })
    
    return profitable.map(p => ({
      orderId: p.orderId,
      externalId: p.orders.externalId,
      profit: Number(p.grossProfit),
      margin: p.profitMargin,
      revenue: Number(p.revenue) + Number(p.shippingRevenue),
      totalCosts: Number(p.totalCosts),
      orderDate: p.orders.orderDate
    }))
  }
}

// Funkcje pomocnicze do eksportu

export async function calculateOrderProfitability(orderId: string): Promise<ProfitabilityData> {
  const analyzer = new ProfitabilityAnalyzer()
  return await analyzer.calculateOrderProfitability(orderId)
}

export async function recalculateAllProfitability(days: number = 90): Promise<number> {
  const analyzer = new ProfitabilityAnalyzer()
  return await analyzer.recalculateAllProfitability(days)
}

export async function getProfitabilityInsights(days: number = 30): Promise<ProfitabilityInsights> {
  const analyzer = new ProfitabilityAnalyzer()
  return await analyzer.getProfitabilityInsights(days)
}