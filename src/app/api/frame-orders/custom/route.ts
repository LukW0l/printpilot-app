import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateStretcherRequirement } from '@/lib/frame-calculator'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { width, height, quantity, notes } = body

    // Validate input
    if (!width || !height || !quantity) {
      return NextResponse.json({
        success: false,
        error: 'Width, height and quantity are required'
      }, { status: 400 })
    }

    // Calculate frame requirements
    const frameReq = calculateStretcherRequirement({ width, height })
    
    // Create custom frame requirement
    const frameRequirement = await prisma.frameRequirement.create({
      data: {
        orderId: null, // No associated order - this is custom
        orderItemId: null,
        width,
        height,
        quantity,
        stripsNeeded: (frameReq.widthBars + frameReq.heightBars) * quantity,
        stripsLength: Math.max(width, height), // Longest dimension
        crossbarsNeeded: frameReq.crossbars * quantity,
        crossbarLength: frameReq.crossbarLength || Math.min(width, height),
        status: 'PENDING',
        notes: notes || `Custom frame order: ${width}x${height}cm x ${quantity}`
      }
    })

    // Find Tempich supplier
    const tempich = await prisma.supplier.findFirst({
      where: { 
        name: { contains: 'Tempich' },
        isActive: true 
      }
    })

    if (tempich) {
      // Create supplier order
      const supplierOrder = await prisma.supplierOrder.create({
        data: {
          supplierId: tempich.id,
          orderNumber: `CUSTOM-${Date.now()}`,
          status: 'DRAFT',
          totalAmount: 0, // Will be calculated
          currency: 'PLN',
          notes: `Custom frame order: ${width}x${height}cm x ${quantity}`,
          items: {
            create: [
              {
                productId: null,
                name: `Kompletne krosno ${width}x${height}cm`,
                sku: `FRAME-${width}x${height}`,
                quantity,
                unitPrice: 0, // To be filled
                totalPrice: 0,
                currency: 'PLN'
              }
            ]
          }
        },
        include: {
          items: true,
          supplier: true
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Custom frame order created successfully',
        data: {
          frameRequirement,
          supplierOrder
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Frame requirement created (no supplier found)',
      data: { frameRequirement }
    })

  } catch (error: any) {
    console.error('Error creating custom frame order:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to create custom frame order'
    }, { status: 500 })
  }
}