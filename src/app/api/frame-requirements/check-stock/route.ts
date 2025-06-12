import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkStockAvailability } from '@/lib/frame-calculator'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { frameRequirementIds, orderItemIds } = body
    
    if (!frameRequirementIds && !orderItemIds) {
      return NextResponse.json(
        { error: 'Either frameRequirementIds or orderItemIds is required' },
        { status: 400 }
      )
    }
    
    let frameRequirements
    
    if (frameRequirementIds) {
      frameRequirements = await prisma.frame_requirements.findMany({
        where: {
          id: { in: frameRequirementIds }
        },
        include: {
          order_items: {
            select: {
              id: true,
              quantity: true,
              name: true,
              orders: {
                select: {
                  externalId: true
                }
              }
            }
          }
        }
      })
    } else {
      frameRequirements = await prisma.frame_requirements.findMany({
        where: {
          orderItemId: { in: orderItemIds }
        },
        include: {
          order_items: {
            select: {
              id: true,
              quantity: true,
              name: true,
              orders: {
                select: {
                  externalId: true
                }
              }
            }
          }
        }
      })
    }
    
    // Get current inventory
    const stretcherStock = await prisma.stretcher_bar_inventory.findMany()
    const crossbarStock = await prisma.crossbar_inventory.findMany()
    
    // Check stock for each frame requirement
    const stockChecks = frameRequirements.map(frameReq => {
      const stockCheck = checkStockAvailability(
        {
          stretcherType: frameReq.frameType,
          widthBars: frameReq.widthBars,
          heightBars: frameReq.heightBars,
          crossbars: frameReq.crossbars,
          crossbarLength: frameReq.crossbarLength || undefined,
          width: frameReq.width,
          height: frameReq.height
        },
        frameReq.order_items.quantity,
        stretcherStock.map(s => ({
          length: s.length,
          type: s.type as 'THIN' | 'THICK',
          stock: s.stock
        })),
        crossbarStock.map(c => ({
          length: c.length,
          stock: c.stock
        }))
      )
      
      return {
        frameRequirementId: frameReq.id,
        orderItemId: frameReq.orderItemId,
        orderExternalId: frameReq.order_items.orders.externalId,
        itemName: frameReq.order_items.name,
        quantity: frameReq.order_items.quantity,
        dimensions: `${frameReq.width}x${frameReq.height}`,
        frameType: frameReq.frameType,
        available: stockCheck.available,
        missing: stockCheck.missing
      }
    })
    
    const allAvailable = stockChecks.every(check => check.available)
    const totalMissing = stockChecks.reduce((acc, check) => {
      check.missing.forEach(missing => {
        const key = `${missing.type}_${missing.length}`
        if (!acc[key]) {
          acc[key] = {
            type: missing.type,
            length: missing.length,
            totalRequired: 0,
            totalAvailable: missing.available
          }
        }
        acc[key].totalRequired += (missing.required - missing.available)
      })
      return acc
    }, {} as Record<string, any>)
    
    return NextResponse.json({
      allAvailable,
      stockChecks,
      summary: {
        totalChecked: stockChecks.length,
        available: stockChecks.filter(check => check.available).length,
        unavailable: stockChecks.filter(check => !check.available).length,
        missingItems: Object.values(totalMissing)
      }
    })
    
  } catch (error) {
    console.error('Error checking frame stock:', error)
    return NextResponse.json(
      { error: 'Failed to check frame stock' },
      { status: 500 }
    )
  }
}