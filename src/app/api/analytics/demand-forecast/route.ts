import { NextRequest, NextResponse } from 'next/server'
import { DemandForecastingEngine, runDemandForecasting, checkInventoryShortages } from '@/lib/demand-forecasting'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'forecast'
    const weeksAhead = parseInt(searchParams.get('weeks') || '4')
    
    const engine = new DemandForecastingEngine()
    
    switch (action) {
      case 'generate':
        // Generuj nowe prognozy
        const forecasts = await engine.generateForecasts(weeksAhead)
        return NextResponse.json({
          success: true,
          message: `Generated ${forecasts.length} demand forecasts`,
          data: forecasts
        })
        
      case 'upcoming':
        // Pobierz nadchodzące prognozy
        const upcoming = await engine.getUpcomingForecasts(weeksAhead)
        return NextResponse.json({
          success: true,
          data: upcoming
        })
        
      case 'shortages':
        // Sprawdź potencjalne braki
        const shortages = await checkInventoryShortages()
        return NextResponse.json({
          success: true,
          data: shortages,
          alerts: shortages.length
        })
        
      case 'product':
        // Prognoza dla konkretnego produktu
        const frameWidth = parseInt(searchParams.get('width') || '0')
        const frameHeight = parseInt(searchParams.get('height') || '0')
        const productType = searchParams.get('type') || 'canvas'
        
        if (frameWidth && frameHeight) {
          const productForecast = await engine.getForecastForProduct(
            frameWidth, 
            frameHeight, 
            productType, 
            weeksAhead
          )
          return NextResponse.json({
            success: true,
            data: productForecast
          })
        } else {
          return NextResponse.json({
            error: 'Missing width and height parameters'
          }, { status: 400 })
        }
        
      default:
        // Domyślnie zwróć nadchodzące prognozy
        const defaultForecasts = await engine.getUpcomingForecasts(weeksAhead)
        return NextResponse.json({
          success: true,
          data: defaultForecasts
        })
    }
    
  } catch (error) {
    console.error('Error in demand forecast API:', error)
    return NextResponse.json({
      error: 'Failed to process demand forecast request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, frameWidth, frameHeight, productType, weeksAhead = 4 } = body
    
    const engine = new DemandForecastingEngine()
    
    if (action === 'regenerate') {
      // Przebuduj wszystkie prognozy
      const forecasts = await runDemandForecasting()
      return NextResponse.json({
        success: true,
        message: `Regenerated ${forecasts.length} demand forecasts`,
        data: forecasts
      })
    }
    
    if (action === 'forecast_product' && frameWidth && frameHeight && productType) {
      // Oblicz prognozę dla konkretnego produktu
      const forecast = await engine.getForecastForProduct(
        frameWidth,
        frameHeight,
        productType,
        weeksAhead
      )
      
      return NextResponse.json({
        success: true,
        data: forecast
      })
    }
    
    return NextResponse.json({
      error: 'Invalid action or missing parameters'
    }, { status: 400 })
    
  } catch (error) {
    console.error('Error in demand forecast POST:', error)
    return NextResponse.json({
      error: 'Failed to process demand forecast request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}