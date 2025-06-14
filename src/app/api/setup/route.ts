import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'

function generateId() {
  return randomBytes(12).toString('base64url')
}

export async function GET(request: NextRequest) {
  try {
    // Security check - only allow in development or with secret
    const secret = request.nextUrl.searchParams.get('secret')
    if (secret !== 'setup-printpilot-2025') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if admin already exists
    const existingAdmin = await prisma.users.findUnique({
      where: { email: 'admin@printpilot.com' }
    })

    if (existingAdmin) {
      return NextResponse.json({ 
        message: 'Setup already completed',
        adminExists: true 
      })
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123!@#', 12)
    const adminUser = await prisma.users.create({
      data: {
        id: generateId(),
        email: 'admin@printpilot.com',
        name: 'Administrator',
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true,
        emailVerified: new Date(),
        updatedAt: new Date()
      }
    })

    // Create Tempich supplier
    const tempichSupplier = await prisma.suppliers.create({
      data: {
        id: generateId(),
        name: 'Tempich',
        contactPerson: 'Zespół Sprzedaży',
        email: 'sprzedaz@tempich.pl',
        phone: '+48 33 812 34 56',
        website: 'https://tempich.pl',
        address: 'ul. Przemysłowa 15',
        city: 'Bielsko-Biała',
        postalCode: '43-300',
        country: 'PL',
        category: 'FRAMES',
        paymentTerms: '14 dni',
        deliveryTime: 3,
        minimumOrderValue: 500,
        rating: 4.5,
        reliability: 4.2,
        qualityRating: 4.7,
        isActive: true,
        isPreferred: true,
        thinStripPricePerMeter: 2.50,
        thickStripPricePerMeter: 3.20,
        crossbarPricePerMeter: 1.80,
        materialMargin: 15.0,
        updatedAt: new Date()
      }
    })

    // Create basic inventory
    const stretcherBars = [
      { length: 20, type: 'THIN', stock: 100, minStock: 20 },
      { length: 30, type: 'THIN', stock: 100, minStock: 20 },
      { length: 40, type: 'THIN', stock: 100, minStock: 20 },
      { length: 50, type: 'THIN', stock: 100, minStock: 20 },
      { length: 60, type: 'THIN', stock: 100, minStock: 20 },
      { length: 20, type: 'THICK', stock: 50, minStock: 10 },
      { length: 30, type: 'THICK', stock: 50, minStock: 10 },
      { length: 40, type: 'THICK', stock: 50, minStock: 10 },
      { length: 50, type: 'THICK', stock: 50, minStock: 10 },
      { length: 60, type: 'THICK', stock: 50, minStock: 10 }
    ]

    for (const bar of stretcherBars) {
      await prisma.stretcher_bar_inventory.create({ 
        data: {
          id: generateId(),
          ...bar,
          updatedAt: new Date()
        }
      })
    }

    // Create crossbars
    const crossbars = [
      { length: 30, stock: 100, minStock: 20 },
      { length: 40, stock: 100, minStock: 20 },
      { length: 50, stock: 100, minStock: 20 },
      { length: 60, stock: 100, minStock: 20 },
      { length: 70, stock: 100, minStock: 20 },
      { length: 80, stock: 100, minStock: 20 }
    ]

    for (const crossbar of crossbars) {
      await prisma.crossbar_inventory.create({ 
        data: {
          id: generateId(),
          ...crossbar,
          updatedAt: new Date()
        }
      })
    }

    // Create production cost config
    await prisma.production_cost_config.create({
      data: {
        id: generateId(),
        thinStretcherPrice: 2.5,
        thickStretcherPrice: 3.2,
        crossbarPrice: 1.8,
        canvasPricePerM2: 25.0,
        printingPricePerM2: 15.0,
        externalPrintingPricePerM2: 18.0,
        useExternalPrintingDefault: true,
        framingPrice: 10.0,
        hookPrice: 1.0,
        cardboardPrice: 1.0,
        wholesaleMarkup: 100.0,
        marginPercentage: 20.0,
        isActive: true,
        updatedAt: new Date()
      }
    })

    // Create standard frame products for Tempich
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
      
      await prisma.supplier_products.create({
        data: {
          id: generateId(),
          supplierId: tempichSupplier.id,
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
    }

    // Create stretcher bar products
    const stretcherLengths = [30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160]
    
    for (const length of stretcherLengths) {
      // Thin bars (up to 90cm)
      if (length <= 90) {
        await prisma.supplier_products.create({
          data: {
            id: generateId(),
            supplierId: tempichSupplier.id,
            name: `Listwa cienka ${length}cm`,
            sku: `TEMP-THIN-${length}`,
            category: 'FRAME_STRIPS',
            width: length,
            unitPrice: parseFloat((length * 0.025 * 1.15).toFixed(2)), // 2.5 PLN/m + 15% margin
            currency: 'PLN',
            minimumQuantity: 4,
            bulkPrice: parseFloat((length * 0.025).toFixed(2)), // No margin for bulk
            bulkMinQuantity: 100,
            inStock: true,
            leadTime: 3,
            updatedAt: new Date()
          }
        })
      }
      
      // Thick bars (all sizes)
      await prisma.supplier_products.create({
        data: {
          id: generateId(),
          supplierId: tempichSupplier.id,
          name: `Listwa gruba ${length}cm`,
          sku: `TEMP-THICK-${length}`,
          category: 'FRAME_STRIPS',
          width: length,
          unitPrice: parseFloat((length * 0.032 * 1.15).toFixed(2)), // 3.2 PLN/m + 15% margin
          currency: 'PLN',
          minimumQuantity: 4,
          bulkPrice: parseFloat((length * 0.032).toFixed(2)), // No margin for bulk
          bulkMinQuantity: 100,
          inStock: true,
          leadTime: 3,
          updatedAt: new Date()
        }
      })
    }

    // Create crossbar products
    const crossbarLengths = [30, 40, 50, 60, 70, 80, 90, 100, 110, 120]
    
    for (const length of crossbarLengths) {
      await prisma.supplier_products.create({
        data: {
          id: generateId(),
          supplierId: tempichSupplier.id,
          name: `Poprzeczka ${length}cm`,
          sku: `TEMP-CROSS-${length}`,
          category: 'CROSSBARS',
          width: length,
          unitPrice: parseFloat((length * 0.018 * 1.15).toFixed(2)), // 1.8 PLN/m + 15% margin
          currency: 'PLN',
          minimumQuantity: 10,
          bulkPrice: parseFloat((length * 0.018).toFixed(2)), // No margin for bulk
          bulkMinQuantity: 100,
          inStock: true,
          leadTime: 3,
          updatedAt: new Date()
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Initial setup completed!',
      data: {
        adminUser: adminUser.email,
        supplier: tempichSupplier.name,
        stretcherBarsCount: stretcherBars.length,
        crossbarsCount: crossbars.length,
        frameKitsCount: standardFrameKits.length,
        stretcherProductsCount: stretcherLengths.length * 2,
        crossbarProductsCount: crossbarLengths.length
      }
    })

  } catch (error: any) {
    console.error('Setup error:', error)
    return NextResponse.json({
      error: error.message || 'Setup failed',
      details: error
    }, { status: 500 })
  }
}