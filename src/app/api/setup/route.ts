import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET(request: NextRequest) {
  try {
    // Security check - only allow in development or with secret
    const secret = request.nextUrl.searchParams.get('secret')
    if (secret !== 'setup-printpilot-2025') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
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
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@printpilot.com',
        name: 'Administrator',
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true,
        emailVerified: new Date()
      }
    })

    // Create Tempich supplier
    const tempichSupplier = await prisma.supplier.create({
      data: {
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
        materialMargin: 15.0
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
      await prisma.stretcherBarInventory.create({ data: bar })
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
      await prisma.crossbarInventory.create({ data: crossbar })
    }

    // Create production cost config
    await prisma.productionCostConfig.create({
      data: {
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
        isActive: true
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Initial setup completed!',
      data: {
        adminUser: adminUser.email,
        supplier: tempichSupplier.name,
        stretcherBarsCount: stretcherBars.length,
        crossbarsCount: crossbars.length
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