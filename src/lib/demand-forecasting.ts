import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'

function generateId() {
  return randomBytes(12).toString('base64url')
}

interface DemandData {
  frameWidth: number
  frameHeight: number
  productType: string
  weekOfYear: number
  year: number
  quantity: number
  orderDate: Date
}

interface ForecastResult {
  frameWidth: number
  frameHeight: number
  productType: string
  weekOfYear: number
  year: number
  forecastedDemand: number
  confidence: number
  seasonalityFactor: number
  averageWeeklyDemand: number
  lastOrderDate?: Date
}

export class DemandForecastingEngine {
  
  // Główna funkcja do generowania prognoz
  async generateForecasts(weeksAhead: number = 4): Promise<ForecastResult[]> {
    console.log(`🔮 Generating demand forecasts for ${weeksAhead} weeks ahead`)
    
    // 1. Pobierz dane historyczne
    const historicalData = await this.getHistoricalDemandData()
    
    // 2. Grupuj dane według kombinacji wymiarów i typu produktu
    const groupedData = this.groupDataByProduct(historicalData)
    
    // 3. Oblicz prognozy dla każdej grupy
    const forecasts: ForecastResult[] = []
    
    for (const [productKey, data] of groupedData) {
      const [widthStr, heightStr, productType] = productKey.split('|')
      const frameWidth = parseInt(widthStr)
      const frameHeight = parseInt(heightStr)
      
      // Generuj prognozy na kolejne tygodnie
      for (let i = 1; i <= weeksAhead; i++) {
        const targetDate = new Date()
        targetDate.setDate(targetDate.getDate() + (i * 7))
        
        const forecast = await this.calculateForecast(
          frameWidth,
          frameHeight,
          productType,
          targetDate,
          data
        )
        
        if (forecast) {
          forecasts.push(forecast)
        }
      }
    }
    
    // 4. Zapisz prognozy do bazy danych
    await this.saveForecastsToDatabase(forecasts)
    
    console.log(`✅ Generated ${forecasts.length} demand forecasts`)
    return forecasts
  }
  
  // Pobierz dane historyczne z zamówień
  private async getHistoricalDemandData(): Promise<DemandData[]> {
    const orders = await prisma.orders.findMany({
      where: {
        orderDate: {
          gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) // Ostatni rok
        }
      },
      include: {
        order_items: {
          include: {
            frame_requirements: true
          }
        }
      }
    })
    
    const demandData: DemandData[] = []
    
    for (const order of orders) {
      for (const item of order.order_items) {
        if (item.frame_requirements) {
          const orderDate = new Date(order.orderDate)
          
          demandData.push({
            frameWidth: item.frame_requirements.width,
            frameHeight: item.frame_requirements.height,
            productType: item.productType || 'canvas',
            weekOfYear: this.getWeekOfYear(orderDate),
            year: orderDate.getFullYear(),
            quantity: item.quantity,
            orderDate
          })
        }
      }
    }
    
    return demandData
  }
  
  // Grupuj dane według produktów
  private groupDataByProduct(data: DemandData[]): Map<string, DemandData[]> {
    const grouped = new Map<string, DemandData[]>()
    
    for (const item of data) {
      const key = `${item.frameWidth}|${item.frameHeight}|${item.productType}`
      
      if (!grouped.has(key)) {
        grouped.set(key, [])
      }
      
      grouped.get(key)!.push(item)
    }
    
    return grouped
  }
  
  // Oblicz prognozę dla konkretnego produktu i tygodnia
  private async calculateForecast(
    frameWidth: number,
    frameHeight: number,
    productType: string,
    targetDate: Date,
    historicalData: DemandData[]
  ): Promise<ForecastResult | null> {
    
    const targetWeek = this.getWeekOfYear(targetDate)
    const targetYear = targetDate.getFullYear()
    
    // Jeśli mamy bardzo mało danych, utwórz bazową prognozę
    if (historicalData.length === 0) {
      return null // Brak danych w ogóle
    }
    
    if (historicalData.length < 3) {
      // Dla małej ilości danych, użyj prostej średniej
      const totalQuantity = historicalData.reduce((sum, d) => sum + d.quantity, 0)
      const avgQuantity = totalQuantity / historicalData.length
      
      return {
        frameWidth,
        frameHeight,
        productType,
        weekOfYear: targetWeek,
        year: targetYear,
        forecastedDemand: Math.max(1, Math.round(avgQuantity)),
        confidence: 0.5, // Niska pewność dla małej ilości danych
        seasonalityFactor: 1.0,
        averageWeeklyDemand: avgQuantity,
        lastOrderDate: historicalData.length > 0 
          ? new Date(Math.max(...historicalData.map(d => d.orderDate.getTime())))
          : undefined
      }
    }
    
    // Oblicz średnie zapotrzebowanie dla tego tygodnia w poprzednich latach
    const sameWeekData = historicalData.filter(d => d.weekOfYear === targetWeek)
    const sameWeekDemand = sameWeekData.reduce((sum, d) => sum + d.quantity, 0)
    const sameWeekAverage = sameWeekData.length > 0 ? sameWeekDemand / sameWeekData.length : 0
    
    // Oblicz ogólną średnią tygodniową
    const weeklyData = this.groupByWeek(historicalData)
    const totalWeeks = weeklyData.size
    const totalDemand = historicalData.reduce((sum, d) => sum + d.quantity, 0)
    const averageWeeklyDemand = totalWeeks > 0 ? totalDemand / totalWeeks : 0
    
    // Oblicz współczynnik sezonowości
    let seasonalityFactor = 1
    if (averageWeeklyDemand > 0) {
      seasonalityFactor = sameWeekAverage / averageWeeklyDemand
      
      // Jeśli nie ma danych dla tego konkretnego tygodnia, użyj średniej z sąsiednich tygodni
      if (sameWeekData.length === 0) {
        const neighborWeeks = [targetWeek - 1, targetWeek + 1]
          .map(w => w < 1 ? 52 + w : w > 52 ? w - 52 : w) // Obsługa przejścia roku
        
        const neighborData = historicalData.filter(d => neighborWeeks.includes(d.weekOfYear))
        if (neighborData.length > 0) {
          const neighborAverage = neighborData.reduce((sum, d) => sum + d.quantity, 0) / neighborData.length
          seasonalityFactor = neighborAverage / averageWeeklyDemand
        }
      }
      
      // Ograniczenia sezonowości - nie pozwalaj na skrajne wartości
      seasonalityFactor = Math.max(0.1, Math.min(3.0, seasonalityFactor))
    }
    
    // Trend analysis - sprawdź czy zapotrzebowanie rośnie czy maleje
    const recentData = historicalData
      .filter(d => d.orderDate >= new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)) // Ostatnie 3 miesiące
      .sort((a, b) => a.orderDate.getTime() - b.orderDate.getTime())
    
    let trendFactor = 1
    if (recentData.length >= 4) {
      const firstHalf = recentData.slice(0, Math.floor(recentData.length / 2))
      const secondHalf = recentData.slice(Math.floor(recentData.length / 2))
      
      const firstHalfAvg = firstHalf.reduce((sum, d) => sum + d.quantity, 0) / firstHalf.length
      const secondHalfAvg = secondHalf.reduce((sum, d) => sum + d.quantity, 0) / secondHalf.length
      
      if (firstHalfAvg > 0) {
        trendFactor = secondHalfAvg / firstHalfAvg
      }
    }
    
    // Oblicz bazową prognozę
    let baseForecast = averageWeeklyDemand * seasonalityFactor * trendFactor
    
    // Jeśli prognoza wyszła 0, ale mamy historię zamówień, ustaw minimum
    if (baseForecast < 0.1 && totalDemand > 0) {
      baseForecast = Math.max(0.5, averageWeeklyDemand * 0.1) // Minimum 10% średniej lub 0.5
    }
    
    // Zastosuj wygładzenie dla małych wartości
    baseForecast = Math.max(0, Math.round(baseForecast * 10) / 10)
    
    // Oblicz pewność prognozy na podstawie konsystencji danych
    const variance = this.calculateVariance(historicalData.map(d => d.quantity))
    const mean = averageWeeklyDemand
    const coefficientOfVariation = mean > 0 ? Math.sqrt(variance) / mean : 1
    const confidence = Math.max(0.1, Math.min(0.95, 1 - Math.min(coefficientOfVariation, 1)))
    
    // Znajdź ostatnią datę zamówienia
    const lastOrderDate = historicalData.length > 0 
      ? new Date(Math.max(...historicalData.map(d => d.orderDate.getTime())))
      : undefined
    
    return {
      frameWidth,
      frameHeight,
      productType,
      weekOfYear: targetWeek,
      year: targetYear,
      forecastedDemand: Math.round(baseForecast),
      confidence,
      seasonalityFactor,
      averageWeeklyDemand,
      lastOrderDate
    }
  }
  
  // Zapisz prognozy do bazy danych
  private async saveForecastsToDatabase(forecasts: ForecastResult[]): Promise<void> {
    for (const forecast of forecasts) {
      await prisma.demand_forecasts.upsert({
        where: {
          frameWidth_frameHeight_productType_weekOfYear_year: {
            frameWidth: forecast.frameWidth,
            frameHeight: forecast.frameHeight,
            productType: forecast.productType,
            weekOfYear: forecast.weekOfYear,
            year: forecast.year
          }
        },
        update: {
          forecastedDemand: forecast.forecastedDemand,
          confidence: forecast.confidence,
          seasonalityFactor: forecast.seasonalityFactor,
          averageWeeklyDemand: forecast.averageWeeklyDemand,
          lastOrderDate: forecast.lastOrderDate,
          calculatedAt: new Date()
        },
        create: {
          id: generateId(),
          frameWidth: forecast.frameWidth,
          frameHeight: forecast.frameHeight,
          productType: forecast.productType,
          weekOfYear: forecast.weekOfYear,
          year: forecast.year,
          historicalDemand: 0, // Będzie obliczone osobno
          forecastedDemand: forecast.forecastedDemand,
          confidence: forecast.confidence,
          seasonalityFactor: forecast.seasonalityFactor,
          averageWeeklyDemand: forecast.averageWeeklyDemand,
          lastOrderDate: forecast.lastOrderDate
        }
      })
    }
  }
  
  // Pobierz aktualną prognozę dla konkretnego produktu
  async getForecastForProduct(
    frameWidth: number, 
    frameHeight: number, 
    productType: string,
    weeksAhead: number = 1
  ): Promise<ForecastResult | null> {
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() + (weeksAhead * 7))
    
    const targetWeek = this.getWeekOfYear(targetDate)
    const targetYear = targetDate.getFullYear()
    
    const forecast = await prisma.demand_forecasts.findUnique({
      where: {
        frameWidth_frameHeight_productType_weekOfYear_year: {
          frameWidth,
          frameHeight,
          productType,
          weekOfYear: targetWeek,
          year: targetYear
        }
      }
    })
    
    if (!forecast) {
      return null
    }
    
    return {
      frameWidth: forecast.frameWidth,
      frameHeight: forecast.frameHeight,
      productType: forecast.productType,
      weekOfYear: forecast.weekOfYear,
      year: forecast.year,
      forecastedDemand: forecast.forecastedDemand,
      confidence: forecast.confidence,
      seasonalityFactor: forecast.seasonalityFactor,
      averageWeeklyDemand: forecast.averageWeeklyDemand,
      lastOrderDate: forecast.lastOrderDate || undefined
    }
  }
  
  // Pobierz wszystkie prognozy na nadchodzące tygodnie
  async getUpcomingForecasts(weeksAhead: number = 4): Promise<ForecastResult[]> {
    const startDate = new Date()
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + (weeksAhead * 7))
    
    const startWeek = this.getWeekOfYear(startDate)
    const endWeek = this.getWeekOfYear(endDate)
    const year = startDate.getFullYear()
    
    const forecasts = await prisma.demand_forecasts.findMany({
      where: {
        year,
        weekOfYear: {
          gte: startWeek,
          lte: endWeek
        }
      },
      orderBy: [
        { weekOfYear: 'asc' },
        { forecastedDemand: 'desc' }
      ]
    })
    
    return forecasts.map(f => ({
      frameWidth: f.frameWidth,
      frameHeight: f.frameHeight,
      productType: f.productType,
      weekOfYear: f.weekOfYear,
      year: f.year,
      forecastedDemand: f.forecastedDemand,
      confidence: f.confidence,
      seasonalityFactor: f.seasonalityFactor,
      averageWeeklyDemand: f.averageWeeklyDemand,
      lastOrderDate: f.lastOrderDate || undefined
    }))
  }
  
  // Wykryj produkty, które mogą się wyczerpać
  async detectPotentialShortages(): Promise<Array<{
    frameWidth: number
    frameHeight: number
    productType: string
    currentStock: number
    forecastedDemand: number
    daysUntilShortage: number
    recommendedOrder: number
  }>> {
    const forecasts = await this.getUpcomingForecasts(8) // 8 tygodni do przodu
    const shortages = []
    
    for (const forecast of forecasts) {
      // Sprawdź aktualny stan magazynu dla tego rozmiaru
      const stretcherStock = await prisma.stretcher_bar_inventory.findMany({
        where: {
          OR: [
            { length: forecast.frameWidth },
            { length: forecast.frameHeight }
          ]
        }
      })
      
      if (stretcherStock.length === 0) continue
      
      const minStock = Math.min(...stretcherStock.map(s => s.stock))
      const weeklyDemand = forecast.forecastedDemand
      
      if (weeklyDemand > 0) {
        const weeksUntilShortage = minStock / weeklyDemand
        const daysUntilShortage = weeksUntilShortage * 7
        
        if (daysUntilShortage < 14) { // Mniej niż 2 tygodnie zapasu
          const recommendedOrder = Math.ceil(weeklyDemand * 4) // 4 tygodnie zapasu
          
          shortages.push({
            frameWidth: forecast.frameWidth,
            frameHeight: forecast.frameHeight,
            productType: forecast.productType,
            currentStock: minStock,
            forecastedDemand: weeklyDemand,
            daysUntilShortage: Math.round(daysUntilShortage),
            recommendedOrder
          })
        }
      }
    }
    
    return shortages.sort((a, b) => a.daysUntilShortage - b.daysUntilShortage)
  }
  
  // Narzędzia pomocnicze
  
  private getWeekOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 1)
    const diff = date.getTime() - start.getTime()
    const oneWeek = 1000 * 60 * 60 * 24 * 7
    return Math.ceil(diff / oneWeek)
  }
  
  private groupByWeek(data: DemandData[]): Map<string, DemandData[]> {
    const grouped = new Map<string, DemandData[]>()
    
    for (const item of data) {
      const key = `${item.year}-${item.weekOfYear}`
      
      if (!grouped.has(key)) {
        grouped.set(key, [])
      }
      
      grouped.get(key)!.push(item)
    }
    
    return grouped
  }
  
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0
    
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2))
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length
  }
}

// Funkcja do uruchamiania prognozowania
export async function runDemandForecasting(): Promise<ForecastResult[]> {
  const engine = new DemandForecastingEngine()
  return await engine.generateForecasts()
}

// Funkcja do sprawdzania braków
export async function checkInventoryShortages() {
  const engine = new DemandForecastingEngine()
  return await engine.detectPotentialShortages()
}