import { NextRequest, NextResponse } from 'next/server'
import { ProfitabilityAnalyzer, calculateOrderProfitability, recalculateAllProfitability, getProfitabilityInsights } from '@/lib/profitability-analyzer'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'insights'
    const days = parseInt(searchParams.get('days') || '30')
    const orderId = searchParams.get('order_id')
    const limit = parseInt(searchParams.get('limit') || '10')
    
    const analyzer = new ProfitabilityAnalyzer()
    
    switch (action) {
      case 'insights':
        // Pobierz ogólne statystyki rentowności
        const insights = await getProfitabilityInsights(days)
        return NextResponse.json({
          success: true,
          data: insights
        })
        
      case 'order':
        // Rentowność konkretnego zamówienia
        if (!orderId) {
          return NextResponse.json({
            error: 'order_id parameter is required'
          }, { status: 400 })
        }
        
        const orderProfitability = await calculateOrderProfitability(orderId)
        return NextResponse.json({
          success: true,
          data: orderProfitability
        })
        
      case 'least_profitable':
        // Najmniej rentowne zamówienia
        const leastProfitable = await analyzer.getLeastProfitableOrders(limit)
        return NextResponse.json({
          success: true,
          data: leastProfitable
        })
        
      case 'most_profitable':
        // Najbardziej rentowne zamówienia
        const mostProfitable = await analyzer.getMostProfitableOrders(limit)
        return NextResponse.json({
          success: true,
          data: mostProfitable
        })
        
      default:
        return NextResponse.json({
          error: 'Invalid action parameter'
        }, { status: 400 })
    }
    
  } catch (error) {
    console.error('Error in profitability analysis GET:', error)
    return NextResponse.json({
      error: 'Failed to process profitability analysis request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, orderId, days = 90 } = body
    
    const analyzer = new ProfitabilityAnalyzer()
    
    switch (action) {
      case 'calculate_order':
        // Oblicz rentowność konkretnego zamówienia
        if (!orderId) {
          return NextResponse.json({
            error: 'orderId is required'
          }, { status: 400 })
        }
        
        const profitability = await calculateOrderProfitability(orderId)
        return NextResponse.json({
          success: true,
          message: 'Order profitability calculated successfully',
          data: profitability
        })
        
      case 'recalculate_all':
        // Przelicz rentowność wszystkich zamówień
        const processed = await recalculateAllProfitability(days)
        return NextResponse.json({
          success: true,
          message: `Recalculated profitability for ${processed} orders`,
          processed
        })
        
      case 'bulk_calculate':
        // Oblicz rentowność dla listy zamówień
        const { orderIds } = body
        
        if (!Array.isArray(orderIds)) {
          return NextResponse.json({
            error: 'orderIds must be an array'
          }, { status: 400 })
        }
        
        const results = []
        let successCount = 0
        let errorCount = 0
        
        for (const id of orderIds) {
          try {
            const result = await calculateOrderProfitability(id)
            results.push({ orderId: id, success: true, data: result })
            successCount++
          } catch (error) {
            results.push({ 
              orderId: id, 
              success: false, 
              error: error instanceof Error ? error.message : 'Unknown error'
            })
            errorCount++
          }
        }
        
        return NextResponse.json({
          success: true,
          message: `Processed ${orderIds.length} orders: ${successCount} successful, ${errorCount} failed`,
          results,
          summary: {
            total: orderIds.length,
            successful: successCount,
            failed: errorCount
          }
        })
        
      default:
        return NextResponse.json({
          error: 'Invalid action parameter'
        }, { status: 400 })
    }
    
  } catch (error) {
    console.error('Error in profitability analysis POST:', error)
    return NextResponse.json({
      error: 'Failed to process profitability analysis request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}