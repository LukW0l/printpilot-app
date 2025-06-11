import { NextRequest, NextResponse } from 'next/server'
import { ProductionTimerManager, startProductionTimer, stopProductionTimer, getProductionStatistics, estimateProductionTime } from '@/lib/production-timer'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'active'
    const days = parseInt(searchParams.get('days') || '30')
    const operatorId = searchParams.get('operator_id')
    const operationType = searchParams.get('operation_type') as any
    const date = searchParams.get('date')
    const exactDate = searchParams.get('exactDate') === 'true'
    
    const manager = new ProductionTimerManager()
    
    switch (action) {
      case 'active':
        // Pobierz aktywne timery
        const activeTimers = await manager.getActiveTimers(operatorId || undefined)
        return NextResponse.json({
          success: true,
          data: activeTimers,
          count: activeTimers.length
        })
        
      case 'history':
        // Pobierz historię timerów
        let history
        if (exactDate && date) {
          // Pobierz timery dla konkretnej daty
          history = await manager.getTimersForDate(date, operationType, operatorId || undefined)
        } else {
          // Pobierz historię z ostatnich dni
          history = await manager.getTimerHistory(days, operationType, operatorId || undefined)
        }
        return NextResponse.json({
          success: true,
          data: history,
          count: history.length
        })
        
      case 'stats':
        // Pobierz statystyki produkcji
        const stats = await getProductionStatistics(days)
        return NextResponse.json({
          success: true,
          data: stats
        })
        
      case 'estimate':
        // Oszacuj czas produkcji
        const unitsCount = parseInt(searchParams.get('units') || '1')
        const difficulty = searchParams.get('difficulty') as any || 'MEDIUM'
        
        if (!operationType) {
          return NextResponse.json({
            error: 'operation_type parameter is required for estimates'
          }, { status: 400 })
        }
        
        const estimate = await estimateProductionTime(operationType, unitsCount, difficulty)
        return NextResponse.json({
          success: true,
          data: estimate
        })
        
      default:
        return NextResponse.json({
          error: 'Invalid action parameter'
        }, { status: 400 })
    }
    
  } catch (error) {
    console.error('Error in production timers GET:', error)
    return NextResponse.json({
      error: 'Failed to process production timer request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, timerId, operationType, orderId, orderItemId, orderItemIds, description, dimensions, unitsCount, operatorName, operatorId, difficulty, quality, notes, cardboardId } = body
    
    const manager = new ProductionTimerManager()
    
    switch (action) {
      case 'start':
        // Rozpocznij nowy timer
        if (!operationType) {
          return NextResponse.json({
            error: 'operationType is required to start timer'
          }, { status: 400 })
        }
        
        // Handle cardboard information for packaging operations
        let enhancedDescription = description
        let enhancedNotes = ''
        
        if (operationType === 'PACKAGING' && cardboardId) {
          // Get cardboard details
          const { prisma } = await import('@/lib/prisma')
          const cardboard = await prisma.cardboardInventory.findUnique({
            where: { id: cardboardId }
          })
          
          if (cardboard) {
            enhancedNotes = `Użyty karton: ${cardboard.width}×${cardboard.height} cm (${cardboard.price} PLN)`
            enhancedDescription = enhancedDescription ? 
              `${enhancedDescription} - Karton ${cardboard.width}×${cardboard.height}` :
              `Pakowanie - Karton ${cardboard.width}×${cardboard.height} cm`
            
            // Decrease cardboard stock
            await prisma.cardboardInventory.update({
              where: { id: cardboardId },
              data: { stock: Math.max(0, cardboard.stock - 1) }
            })
          }
        }

        const newTimer = await startProductionTimer(operationType, {
          orderId,
          orderItemId,
          description: enhancedDescription,
          dimensions,
          unitsCount,
          operatorName,
          operatorId,
          difficulty,
          notes: enhancedNotes
        })
        
        return NextResponse.json({
          success: true,
          message: 'Timer started successfully',
          data: newTimer
        })
        
      case 'stop':
        // Zakończ timer
        if (!timerId) {
          return NextResponse.json({
            error: 'timerId is required to stop timer'
          }, { status: 400 })
        }
        
        const stoppedTimer = await stopProductionTimer(timerId, {
          quality,
          notes
        })
        
        // If this was a packaging operation with cardboard cost, add it to production costs
        if (stoppedTimer.operationType === 'PACKAGING' && stoppedTimer.orderItemId && stoppedTimer.notes?.includes('Użyty karton:')) {
          const { prisma } = await import('@/lib/prisma')
          
          // Extract cardboard price from notes
          const priceMatch = stoppedTimer.notes.match(/\(([0-9.]+) PLN\)/)
          if (priceMatch) {
            const cardboardCost = parseFloat(priceMatch[1])
            
            // Update or create production cost record
            await prisma.productionCost.upsert({
              where: { orderItemId: stoppedTimer.orderItemId },
              update: {
                cardboardCost: cardboardCost,
                totalMaterialCost: { increment: cardboardCost }
              },
              create: {
                orderItemId: stoppedTimer.orderItemId,
                cardboardCost: cardboardCost,
                totalMaterialCost: cardboardCost,
                stretcherCost: 0,
                crossbarCost: 0,
                canvasCost: 0,
                printingCost: 0,
                framingCost: 0,
                hookCost: 0,
                wholesalePrice: 0,
                finalPrice: 0,
                profit: 0
              }
            })
            
            console.log(`💰 Added cardboard cost ${cardboardCost} PLN to order item ${stoppedTimer.orderItemId}`)
          }
        }
        
        return NextResponse.json({
          success: true,
          message: 'Timer stopped successfully',
          data: stoppedTimer
        })
        
      case 'pause':
        // Wstrzymaj timer
        if (!timerId) {
          return NextResponse.json({
            error: 'timerId is required to pause timer'
          }, { status: 400 })
        }
        
        const pausedTimer = await manager.pauseTimer(timerId)
        
        return NextResponse.json({
          success: true,
          message: 'Timer paused successfully',
          data: pausedTimer
        })
        
      case 'resume':
        // Wznów timer
        if (!timerId) {
          return NextResponse.json({
            error: 'timerId is required to resume timer'
          }, { status: 400 })
        }
        
        const resumedTimer = await manager.resumeTimer(timerId)
        
        return NextResponse.json({
          success: true,
          message: 'Timer resumed successfully',
          data: resumedTimer
        })
        
      default:
        return NextResponse.json({
          error: 'Invalid action parameter'
        }, { status: 400 })
    }
    
  } catch (error) {
    console.error('Error in production timers POST:', error)
    return NextResponse.json({
      error: 'Failed to process production timer request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const timerId = searchParams.get('id')
    
    if (!timerId) {
      return NextResponse.json({
        error: 'Timer ID is required'
      }, { status: 400 })
    }
    
    // Usuń timer (jeśli nie jest zakończony)
    const { prisma } = await import('@/lib/prisma')
    
    const timer = await prisma.productionTimer.findUnique({
      where: { id: timerId }
    })
    
    if (!timer) {
      return NextResponse.json({
        error: 'Timer not found'
      }, { status: 404 })
    }
    
    if (timer.isCompleted) {
      return NextResponse.json({
        error: 'Cannot delete completed timer'
      }, { status: 400 })
    }
    
    await prisma.productionTimer.delete({
      where: { id: timerId }
    })
    
    return NextResponse.json({
      success: true,
      message: 'Timer deleted successfully'
    })
    
  } catch (error) {
    console.error('Error in production timers DELETE:', error)
    return NextResponse.json({
      error: 'Failed to delete production timer',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}