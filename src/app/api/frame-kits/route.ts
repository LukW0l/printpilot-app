import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'

function generateId() {
  return randomBytes(12).toString('base64url')
}

export async function GET(request: NextRequest) {
  try {
    // Find Tempich supplier
    const tempich = await prisma.suppliers.findFirst({
      where: { 
        name: { contains: 'Tempich' },
        isActive: true 
      }
    })

    if (!tempich) {
      return NextResponse.json({
        success: false,
        error: 'Tempich supplier not found'
      }, { status: 404 })
    }

    // Get standard frame kits from supplier_products
    const frameKits = await prisma.supplier_products.findMany({
      where: {
        supplierId: tempich.id,
        category: 'FRAME_KITS',
        inStock: true,
        OR: [
          { sku: { endsWith: '-THIN' } },
          { sku: { endsWith: '-THICK' } }
        ]
      },
      orderBy: [
        { width: 'asc' },
        { height: 'asc' }
      ]
    })

    // Transform to frame kit format for compatibility
    const kits = frameKits.map(product => ({
      id: product.id,
      name: product.name || '',
      width: product.width || 0,
      height: product.height || 0,
      frameType: product.sku?.endsWith('-THIN') ? 'THIN' : 'THICK',
      crossbars: 0, // Will be calculated based on dimensions
      description: product.name,
      isActive: product.inStock
    }))

    return NextResponse.json({
      success: true,
      data: kits
    })
  } catch (error: any) {
    console.error('Error fetching frame kits:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch frame kits' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === 'init-standard-products') {
      // Initialize standard products if they don't exist
      const tempich = await prisma.suppliers.findFirst({
        where: { 
          name: { contains: 'Tempich' },
          isActive: true 
        }
      })

      if (!tempich) {
        return NextResponse.json({
          success: false,
          error: 'Tempich supplier not found'
        }, { status: 404 })
      }

      // Check if standard products already exist
      const existingProducts = await prisma.supplier_products.count({
        where: {
          supplierId: tempich.id,
          category: 'FRAME_KITS',
          inStock: true,
          OR: [
            { sku: { endsWith: '-THIN' } },
            { sku: { endsWith: '-THICK' } }
          ]
        }
      })

      if (existingProducts > 0) {
        return NextResponse.json({
          success: false,
          message: 'Standard products already exist',
          count: existingProducts
        })
      }

      // Create standard frame products
      const standardFrameKits = [
        // Small sizes (THIN)
        { width: 30, height: 40, frameType: 'THIN', stripPrice: tempich.thinStripPricePerMeter || 2.50 },
        { width: 40, height: 50, frameType: 'THIN', stripPrice: tempich.thinStripPricePerMeter || 2.50 },
        { width: 40, height: 60, frameType: 'THIN', stripPrice: tempich.thinStripPricePerMeter || 2.50 },
        { width: 50, height: 60, frameType: 'THIN', stripPrice: tempich.thinStripPricePerMeter || 2.50 },
        { width: 50, height: 70, frameType: 'THIN', stripPrice: tempich.thinStripPricePerMeter || 2.50 },
        { width: 60, height: 80, frameType: 'THIN', stripPrice: tempich.thinStripPricePerMeter || 2.50 },
        { width: 70, height: 90, frameType: 'THIN', stripPrice: tempich.thinStripPricePerMeter || 2.50 },
        { width: 80, height: 90, frameType: 'THIN', stripPrice: tempich.thinStripPricePerMeter || 2.50 },
        // Large sizes (THICK)
        { width: 90, height: 120, frameType: 'THICK', stripPrice: tempich.thickStripPricePerMeter || 3.20 },
        { width: 100, height: 120, frameType: 'THICK', stripPrice: tempich.thickStripPricePerMeter || 3.20 },
        { width: 100, height: 140, frameType: 'THICK', stripPrice: tempich.thickStripPricePerMeter || 3.20 },
        { width: 120, height: 140, frameType: 'THICK', stripPrice: tempich.thickStripPricePerMeter || 3.20 },
        { width: 120, height: 160, frameType: 'THICK', stripPrice: tempich.thickStripPricePerMeter || 3.20 }
      ]

      const createdProducts = []

      for (const kit of standardFrameKits) {
        const perimeterM = ((kit.width + kit.height) * 2) / 100
        const unitPrice = perimeterM * Number(kit.stripPrice) * 1.15 // 15% margin
        
        const product = await prisma.supplier_products.create({
          data: {
            id: generateId(),
            supplierId: tempich.id,
            name: `Kompletne krosno ${kit.width}x${kit.height}cm (${kit.frameType})`,
            sku: `FRAME-${kit.width}x${kit.height}-${kit.frameType}`,
            category: 'FRAME_KITS',
            width: kit.width,
            height: kit.height,
            unitPrice: parseFloat(unitPrice.toFixed(2)),
            currency: 'PLN',
            minimumQuantity: 1,
            bulkPrice: parseFloat((unitPrice * 0.9).toFixed(2)), // 10% discount for bulk
            bulkMinQuantity: 10,
            inStock: true,
            leadTime: 3,
            updatedAt: new Date()
          }
        })
        createdProducts.push(product)
      }

      return NextResponse.json({
        success: true,
        message: 'Standard frame kits created successfully',
        data: {
          productsCreated: createdProducts.length,
          products: createdProducts
        }
      }, { status: 201 })
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('Error in frame kits POST:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process request' },
      { status: 500 }
    )
  }
}