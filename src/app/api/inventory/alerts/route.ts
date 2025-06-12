import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export interface InventoryAlert {
  id: string
  type: 'stretcher_bar' | 'crossbar' | 'cardboard'
  itemName: string
  currentStock: number
  minStock: number
  urgency: 'low' | 'medium' | 'high'
}

async function checkLowInventory(): Promise<InventoryAlert[]> {
  const alerts: InventoryAlert[] = []

  try {
    // Check stretcher bars
    const lowStockStretcherBars = await prisma.stretcher_bar_inventory.findMany({
      where: {
        stock: {
          lte: prisma.stretcher_bar_inventory.fields.minStock
        }
      },
      orderBy: {
        stock: 'asc'
      }
    })

    lowStockStretcherBars.forEach(bar => {
      const stockRatio = bar.stock / bar.minStock
      let urgency: 'low' | 'medium' | 'high' = 'low'
      
      if (stockRatio <= 0.2) urgency = 'high'
      else if (stockRatio <= 0.5) urgency = 'medium'

      alerts.push({
        id: `stretcher-${bar.id}`,
        type: 'stretcher_bar',
        itemName: `Listwy nośne ${bar.length}cm ${bar.type}`,
        currentStock: bar.stock,
        minStock: bar.minStock,
        urgency
      })
    })

    // Check crossbars
    const lowStockCrossbars = await prisma.crossbar_inventory.findMany({
      where: {
        stock: {
          lte: prisma.crossbar_inventory.fields.minStock
        }
      },
      orderBy: {
        stock: 'asc'
      }
    })

    lowStockCrossbars.forEach(crossbar => {
      const stockRatio = crossbar.stock / crossbar.minStock
      let urgency: 'low' | 'medium' | 'high' = 'low'
      
      if (stockRatio <= 0.2) urgency = 'high'
      else if (stockRatio <= 0.5) urgency = 'medium'

      alerts.push({
        id: `crossbar-${crossbar.id}`,
        type: 'crossbar',
        itemName: `Poprzeczki ${crossbar.length}cm`,
        currentStock: crossbar.stock,
        minStock: crossbar.minStock,
        urgency
      })
    })

    // Check cardboard (if minStock field exists)
    try {
      const lowStockCardboard = await prisma.cardboard_inventory.findMany({
        where: {
          stock: {
            lt: 50 // Basic threshold for cardboard
          }
        },
        orderBy: {
          stock: 'asc'
        },
        take: 5
      })

      lowStockCardboard.forEach(cardboard => {
        const urgency = cardboard.stock <= 10 ? 'high' : cardboard.stock <= 25 ? 'medium' : 'low'

        alerts.push({
          id: `cardboard-${cardboard.id}`,
          type: 'cardboard',
          itemName: `Tektura ${(cardboard as any).type} ${cardboard.width}×${cardboard.height}×${(cardboard as any).thickness}mm`,
          currentStock: cardboard.stock,
          minStock: 50, // Standard minimum
          urgency
        })
      })
    } catch (error) {
      console.log('Cardboard inventory check skipped - table might not have minStock field')
    }

  } catch (error) {
    console.error('Error checking inventory:', error)
  }

  return alerts.sort((a, b) => {
    const urgencyOrder = { high: 3, medium: 2, low: 1 }
    return urgencyOrder[b.urgency] - urgencyOrder[a.urgency]
  })
}

export async function GET() {
  try {
    const alerts = await checkLowInventory()
    
    return NextResponse.json({
      success: true,
      alerts: alerts.filter(alert => alert.urgency === 'high' || alert.urgency === 'medium').slice(0, 3)
    })
  } catch (error) {
    console.error('Inventory alerts API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to check inventory alerts' },
      { status: 500 }
    )
  }
}