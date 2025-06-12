import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'

function generateId() {
  return randomBytes(12).toString('base64url')
}

export async function GET(request: NextRequest) {
  try {
    // Security check
    const secret = request.nextUrl.searchParams.get('secret')
    if (secret !== 'init-vercel-2025') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    let createdProducts = []

    if (existingProducts === 0) {
      // Create standard frame products
      const standardFrameKits = [
        // Small sizes (THIN)
        { width: 30, height: 40, frameType: 'THIN', stripPrice: 2.50 },
        { width: 40, height: 50, frameType: 'THIN', stripPrice: 2.50 },
        { width: 40, height: 60, frameType: 'THIN', stripPrice: 2.50 },
        { width: 50, height: 60, frameType: 'THIN', stripPrice: 2.50 },
        { width: 50, height: 70, frameType: 'THIN', stripPrice: 2.50 },
        { width: 60, height: 80, frameType: 'THIN', stripPrice: 2.50 },
        { width: 70, height: 90, frameType: 'THIN', stripPrice: 2.50 },
        { width: 80, height: 90, frameType: 'THIN', stripPrice: 2.50 },
        // Large sizes (THICK)
        { width: 90, height: 120, frameType: 'THICK', stripPrice: 3.20 },
        { width: 100, height: 120, frameType: 'THICK', stripPrice: 3.20 },
        { width: 100, height: 140, frameType: 'THICK', stripPrice: 3.20 },
        { width: 120, height: 140, frameType: 'THICK', stripPrice: 3.20 },
        { width: 120, height: 160, frameType: 'THICK', stripPrice: 3.20 }
      ]

      for (const kit of standardFrameKits) {
        const perimeterM = ((kit.width + kit.height) * 2) / 100
        const unitPrice = perimeterM * kit.stripPrice * 1.15 // 15% margin
        
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
            bulkPrice: parseFloat((unitPrice * 0.9).toFixed(2)),
            bulkMinQuantity: 10,
            inStock: true,
            leadTime: 3,
            updatedAt: new Date()
          }
        })
        createdProducts.push(product)
      }

      // Create stretcher bar products
      const stretcherLengths = [30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160]
      
      for (const length of stretcherLengths) {
        // Thin bars (up to 90cm)
        if (length <= 90) {
          const product = await prisma.supplier_products.create({
            data: {
              id: generateId(),
              supplierId: tempich.id,
              name: `Listwa cienka ${length}cm`,
              sku: `TEMP-THIN-${length}`,
              category: 'FRAME_STRIPS',
              width: length,
              unitPrice: parseFloat((length * 0.025 * 1.15).toFixed(2)),
              currency: 'PLN',
              minimumQuantity: 4,
              bulkPrice: parseFloat((length * 0.025).toFixed(2)),
              bulkMinQuantity: 100,
              inStock: true,
              leadTime: 3,
              updatedAt: new Date()
            }
          })
          createdProducts.push(product)
        }
        
        // Thick bars (all sizes)
        const product = await prisma.supplier_products.create({
          data: {
            id: generateId(),
            supplierId: tempich.id,
            name: `Listwa gruba ${length}cm`,
            sku: `TEMP-THICK-${length}`,
            category: 'FRAME_STRIPS',
            width: length,
            unitPrice: parseFloat((length * 0.032 * 1.15).toFixed(2)),
            currency: 'PLN',
            minimumQuantity: 4,
            bulkPrice: parseFloat((length * 0.032).toFixed(2)),
            bulkMinQuantity: 100,
            inStock: true,
            leadTime: 3,
            updatedAt: new Date()
          }
        })
        createdProducts.push(product)
      }

      // Create crossbar products
      const crossbarLengths = [30, 40, 50, 60, 70, 80, 90, 100, 110, 120]
      
      for (const length of crossbarLengths) {
        const product = await prisma.supplier_products.create({
          data: {
            id: generateId(),
            supplierId: tempich.id,
            name: `Poprzeczka ${length}cm`,
            sku: `TEMP-CROSS-${length}`,
            category: 'CROSSBARS',
            width: length,
            unitPrice: parseFloat((length * 0.018 * 1.15).toFixed(2)),
            currency: 'PLN',
            minimumQuantity: 10,
            bulkPrice: parseFloat((length * 0.018).toFixed(2)),
            bulkMinQuantity: 100,
            inStock: true,
            leadTime: 3,
            updatedAt: new Date()
          }
        })
        createdProducts.push(product)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Vercel products initialized successfully',
      data: {
        supplierId: tempich.id,
        supplierName: tempich.name,
        existingProducts,
        newProductsCreated: createdProducts.length,
        totalProducts: existingProducts + createdProducts.length
      }
    })

  } catch (error: any) {
    console.error('Error initializing Vercel products:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to initialize products'
    }, { status: 500 })
  }
}