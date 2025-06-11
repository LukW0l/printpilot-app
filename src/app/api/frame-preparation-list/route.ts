import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRequiredStretcherBars, getRequiredCrossbars } from '@/lib/frame-calculator'

interface FrameListItem {
  type: 'stretcher' | 'crossbar'
  frameType?: 'THIN' | 'THICK'
  length: number
  totalQuantity: number
  orders: Array<{
    orderExternalId: string
    customerName: string
    itemName: string
    quantity: number
    dimensions: string
  }>
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { frameRequirementIds, status } = body
    
    if (!frameRequirementIds || frameRequirementIds.length === 0) {
      return NextResponse.json(
        { error: 'frameRequirementIds is required' },
        { status: 400 }
      )
    }
    
    // Get frame requirements with order details
    const frameRequirements = await prisma.frameRequirement.findMany({
      where: {
        id: { in: frameRequirementIds },
        ...(status && { frameStatus: status })
      },
      include: {
        orderItem: {
          include: {
            order: {
              select: {
                externalId: true,
                customerName: true
              }
            }
          }
        }
      }
    })
    
    if (frameRequirements.length === 0) {
      return NextResponse.json(
        { error: 'No frame requirements found' },
        { status: 404 }
      )
    }
    
    // Group by frame components
    const stretcherBars: Record<string, FrameListItem> = {}
    const crossbars: Record<string, FrameListItem> = {}
    
    frameRequirements.forEach(frameReq => {
      const orderInfo = {
        orderExternalId: frameReq.orderItem.order.externalId,
        customerName: frameReq.orderItem.order.customerName,
        itemName: frameReq.orderItem.name,
        quantity: frameReq.orderItem.quantity,
        dimensions: `${frameReq.width}x${frameReq.height}cm`
      }
      
      // Process stretcher bars
      const requiredBars = getRequiredStretcherBars({
        stretcherType: frameReq.frameType,
        widthBars: frameReq.widthBars,
        heightBars: frameReq.heightBars,
        crossbars: frameReq.crossbars,
        crossbarLength: frameReq.crossbarLength || undefined,
        width: frameReq.width,
        height: frameReq.height
      })
      
      requiredBars.forEach(bar => {
        const key = `${bar.type}_${bar.length}`
        const totalNeeded = bar.quantity * frameReq.orderItem.quantity
        
        if (!stretcherBars[key]) {
          stretcherBars[key] = {
            type: 'stretcher',
            frameType: bar.type,
            length: bar.length,
            totalQuantity: 0,
            orders: []
          }
        }
        
        stretcherBars[key].totalQuantity += totalNeeded
        stretcherBars[key].orders.push({
          ...orderInfo,
          quantity: totalNeeded
        })
      })
      
      // Process crossbars
      const requiredCrossbars = getRequiredCrossbars({
        stretcherType: frameReq.frameType,
        widthBars: frameReq.widthBars,
        heightBars: frameReq.heightBars,
        crossbars: frameReq.crossbars,
        crossbarLength: frameReq.crossbarLength || undefined,
        width: frameReq.width,
        height: frameReq.height
      })
      
      requiredCrossbars.forEach(crossbar => {
        const key = `crossbar_${crossbar.length}`
        const totalNeeded = crossbar.quantity * frameReq.orderItem.quantity
        
        if (!crossbars[key]) {
          crossbars[key] = {
            type: 'crossbar',
            length: crossbar.length,
            totalQuantity: 0,
            orders: []
          }
        }
        
        crossbars[key].totalQuantity += totalNeeded
        crossbars[key].orders.push({
          ...orderInfo,
          quantity: totalNeeded
        })
      })
    })
    
    // Get current inventory to check availability
    const stretcherStock = await prisma.stretcherBarInventory.findMany()
    const crossbarStock = await prisma.crossbarInventory.findMany()
    
    // Add availability info to stretcher bars
    const stretcherBarsList = Object.values(stretcherBars).map(item => {
      const stock = stretcherStock.find(s => 
        s.length === item.length && s.type === item.frameType
      )
      return {
        ...item,
        currentStock: stock?.stock || 0,
        available: (stock?.stock || 0) >= item.totalQuantity,
        deficit: Math.max(0, item.totalQuantity - (stock?.stock || 0))
      }
    })
    
    // Add availability info to crossbars
    const crossbarsList = Object.values(crossbars).map(item => {
      const stock = crossbarStock.find(s => s.length === item.length)
      return {
        ...item,
        currentStock: stock?.stock || 0,
        available: (stock?.stock || 0) >= item.totalQuantity,
        deficit: Math.max(0, item.totalQuantity - (stock?.stock || 0))
      }
    })
    
    const allItems = [...stretcherBarsList, ...crossbarsList]
    const allAvailable = allItems.every(item => item.available)
    const totalDeficit = allItems.reduce((sum, item) => sum + (item.deficit || 0), 0)
    
    const summary = {
      totalFrameRequirements: frameRequirements.length,
      totalOrders: new Set(frameRequirements.map(f => f.orderItem.order.externalId)).size,
      stretcherBarsNeeded: stretcherBarsList.length,
      crossbarsNeeded: crossbarsList.length,
      allAvailable,
      totalDeficit,
      missingItems: allItems.filter(item => !item.available).length
    }
    
    return NextResponse.json({
      summary,
      stretcherBars: stretcherBarsList.sort((a, b) => {
        if (a.frameType !== b.frameType) {
          return a.frameType === 'THIN' ? -1 : 1
        }
        return a.length - b.length
      }),
      crossbars: crossbarsList.sort((a, b) => a.length - b.length),
      frameRequirements: frameRequirements.map(req => ({
        id: req.id,
        orderExternalId: req.orderItem.order.externalId,
        customerName: req.orderItem.order.customerName,
        itemName: req.orderItem.name,
        dimensions: `${req.width}x${req.height}cm`,
        frameType: req.frameType,
        quantity: req.orderItem.quantity,
        frameStatus: req.frameStatus
      }))
    })
    
  } catch (error) {
    console.error('Error generating frame preparation list:', error)
    return NextResponse.json(
      { error: 'Failed to generate frame preparation list' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'NOT_PREPARED'
    
    // Get all frame requirements with specified status
    const frameRequirements = await prisma.frameRequirement.findMany({
      where: { frameStatus: status as any },
      include: {
        orderItem: {
          include: {
            order: {
              select: {
                externalId: true,
                customerName: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    })
    
    if (frameRequirements.length === 0) {
      return NextResponse.json({
        summary: {
          totalFrameRequirements: 0,
          totalOrders: 0,
          stretcherBarsNeeded: 0,
          crossbarsNeeded: 0,
          allAvailable: true,
          totalDeficit: 0,
          missingItems: 0
        },
        stretcherBars: [],
        crossbars: [],
        frameRequirements: []
      })
    }
    
    // Use POST logic with all frame requirement IDs
    const frameRequirementIds = frameRequirements.map(req => req.id)
    
    // Call the POST method logic
    const postRequest = new NextRequest(request.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frameRequirementIds, status })
    })
    
    return POST(postRequest)
    
  } catch (error) {
    console.error('Error fetching frame preparation list:', error)
    return NextResponse.json(
      { error: 'Failed to fetch frame preparation list' },
      { status: 500 }
    )
  }
}