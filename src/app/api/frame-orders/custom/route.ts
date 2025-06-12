import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateStretcherRequirement } from '@/lib/frame-calculator'
import { randomBytes } from 'crypto'

function generateId() {
  return randomBytes(12).toString('base64url')
}

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
    const tempich = await prisma.suppliers.findFirst({
      where: { 
        name: { contains: 'Tempich' },
        isActive: true 
      }
    })

    if (tempich) {
      // Calculate estimated price
      const stripPrice = tempich.thinStripPricePerMeter ? Number(tempich.thinStripPricePerMeter) : 2.5
      const crossbarPrice = tempich.crossbarPricePerMeter ? Number(tempich.crossbarPricePerMeter) : 1.8
      
      const estimatedPrice = tempich.thinStripPricePerMeter 
        ? (frameReq.widthBars * width * stripPrice / 100) + 
          (frameReq.heightBars * height * stripPrice / 100) +
          (frameReq.crossbars * (frameReq.crossbarLength || 0) * crossbarPrice / 100)
        : 50 // fallback price per frame

      const totalPrice = estimatedPrice * quantity

      // Create custom product for Tempich
      const customProduct = await prisma.supplier_products.create({
        data: {
          id: generateId(),
          supplierId: tempich.id,
          name: `Kompletne krosno ${width}x${height}cm (${frameReq.stretcherType})`,
          sku: `FRAME-${width}x${height}-${frameReq.stretcherType}`,
          category: 'FRAME_KITS',
          width,
          height,
          unitPrice: estimatedPrice,
          currency: 'PLN',
          minimumQuantity: 1,
          inStock: true,
          updatedAt: new Date()
        }
      })

      // Create supplier order
      const supplierOrder = await prisma.supplier_orders.create({
        data: {
          id: generateId(),
          supplierId: tempich.id,
          orderNumber: `CUSTOM-${Date.now()}`,
          status: 'SENT', // Auto-send custom orders
          totalAmount: totalPrice,
          currency: 'PLN',
          notes: `Custom frame orders: ${width}x${height}cm x ${quantity} szt.\n` +
                 `Typ: ${frameReq.stretcherType}\n` +
                 `Listwy: ${frameReq.widthBars + frameReq.heightBars} szt.\n` +
                 `Poprzeczki: ${frameReq.crossbars} szt.`,
          updatedAt: new Date(),
          supplier_order_items: {
            create: [
              {
                id: generateId(),
                productId: customProduct.id,
                quantity,
                unitPrice: estimatedPrice,
                totalPrice
              }
            ]
          }
        },
        include: {
          supplier_order_items: {
            include: {
              supplier_products: true
            }
          },
          suppliers: true
        }
      })

      // Mark custom product as out of stock to hide from regular orders
      await prisma.supplier_products.update({
        where: { id: customProduct.id },
        data: { 
          inStock: false
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
    console.error('Error creating custom frame orders:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to create custom frame order'
    }, { status: 500 })
  }
}