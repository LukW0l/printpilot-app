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
    console.log('📏 Frame calculation:', frameReq)

    // Find Tempich supplier
    const tempich = await prisma.supplier.findFirst({
      where: { 
        name: { contains: 'Tempich' },
        isActive: true 
      }
    })

    if (tempich) {
      // Calculate estimated price
      const estimatedPrice = tempich.thinStripPricePerMeter 
        ? (frameReq.widthBars * width * tempich.thinStripPricePerMeter / 100) + 
          (frameReq.heightBars * height * tempich.thinStripPricePerMeter / 100) +
          (frameReq.crossbars * (frameReq.crossbarLength || 0) * (tempich.crossbarPricePerMeter || 0) / 100)
        : 50 // fallback price per frame

      const totalPrice = estimatedPrice * quantity

      // Create supplier order
      const supplierOrder = await prisma.supplierOrder.create({
        data: {
          supplierId: tempich.id,
          orderNumber: `CUSTOM-${Date.now()}`,
          status: 'DRAFT',
          totalAmount: totalPrice,
          currency: 'PLN',
          notes: `Custom frame order: ${width}x${height}cm x ${quantity} szt.\n` +
                 `Typ: ${frameReq.stretcherType}\n` +
                 `Listwy: ${frameReq.widthBars + frameReq.heightBars} szt.\n` +
                 `Poprzeczki: ${frameReq.crossbars} szt.`,
          items: {
            create: [
              {
                productId: null,
                name: `Kompletne krosno ${width}x${height}cm (${frameReq.stretcherType})`,
                sku: `FRAME-${width}x${height}-${frameReq.stretcherType}`,
                quantity,
                unitPrice: estimatedPrice,
                totalPrice,
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
          supplierOrder,
          frameCalculation: frameReq,
          estimatedPrice: {
            perFrame: estimatedPrice,
            total: totalPrice,
            currency: 'PLN'
          }
        }
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Supplier Tempich not found'
    }, { status: 404 })

  } catch (error: any) {
    console.error('Error creating custom frame order:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to create custom frame order'
    }, { status: 500 })
  }
}