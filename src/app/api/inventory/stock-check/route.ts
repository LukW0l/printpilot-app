import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface LowStockItem {
  id: string
  type: 'stretcher' | 'crossbar'
  frameType?: 'THIN' | 'THICK'
  length: number
  currentStock: number
  minStock: number
  deficit: number
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const checkLowStock = searchParams.get('lowStock') === 'true'
    
    // Get all stretcher bar inventory
    const stretcherBars = await prisma.stretcherBarInventory.findMany({
      orderBy: [
        { type: 'asc' },
        { length: 'asc' }
      ]
    })
    
    // Get all crossbar inventory
    const crossbars = await prisma.crossbarInventory.findMany({
      orderBy: { length: 'asc' }
    })
    
    if (checkLowStock) {
      const lowStockItems: LowStockItem[] = []
      
      // Check stretcher bars
      stretcherBars.forEach(bar => {
        if (bar.stock <= bar.minStock) {
          lowStockItems.push({
            id: bar.id,
            type: 'stretcher',
            frameType: bar.type as "THIN" | "THICK",
            length: bar.length,
            currentStock: bar.stock,
            minStock: bar.minStock,
            deficit: bar.minStock - bar.stock
          })
        }
      })
      
      // Check crossbars
      crossbars.forEach(crossbar => {
        if (crossbar.stock <= crossbar.minStock) {
          lowStockItems.push({
            id: crossbar.id,
            type: 'crossbar',
            length: crossbar.length,
            currentStock: crossbar.stock,
            minStock: crossbar.minStock,
            deficit: crossbar.minStock - crossbar.stock
          })
        }
      })
      
      return NextResponse.json({
        lowStockItems,
        totalLowStockItems: lowStockItems.length
      })
    }
    
    // Return full inventory summary
    const summary = {
      stretcherBars: {
        thin: stretcherBars.filter(bar => bar.type === 'THIN'),
        thick: stretcherBars.filter(bar => bar.type === 'THICK'),
        totalItems: stretcherBars.length,
        totalStock: stretcherBars.reduce((sum, bar) => sum + bar.stock, 0)
      },
      crossbars: {
        items: crossbars,
        totalItems: crossbars.length,
        totalStock: crossbars.reduce((sum, bar) => sum + bar.stock, 0)
      }
    }
    
    return NextResponse.json(summary)
  } catch (error) {
    console.error('Error checking stock:', error)
    return NextResponse.json(
      { error: 'Failed to check stock' },
      { status: 500 }
    )
  }
}