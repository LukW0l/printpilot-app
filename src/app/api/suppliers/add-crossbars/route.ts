import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'

function generateId() {
  return randomBytes(12).toString('base64url')
}

export async function POST(request: NextRequest) {
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

    // Check if crossbars already exist
    const existingCrossbars = await prisma.supplier_products.count({
      where: {
        supplierId: tempich.id,
        category: 'CROSSBARS'
      }
    })

    if (existingCrossbars > 0) {
      return NextResponse.json({
        success: false,
        message: 'Crossbars already exist',
        count: existingCrossbars
      })
    }

    // Create crossbar products
    const crossbarLengths = [30, 40, 50, 60, 70, 80, 90, 100, 110, 120]
    const createdProducts = []
    
    for (const length of crossbarLengths) {
      const product = await prisma.supplier_products.create({
        data: {
          id: generateId(),
          supplierId: tempich.id,
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
      createdProducts.push(product)
    }

    return NextResponse.json({
      success: true,
      message: 'Crossbars added successfully',
      data: {
        supplierId: tempich.id,
        supplierName: tempich.name,
        crossbarsCreated: createdProducts.length,
        products: createdProducts.map(p => ({
          name: p.name,
          sku: p.sku,
          price: p.unitPrice
        }))
      }
    })

  } catch (error: any) {
    console.error('Error adding crossbars:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to add crossbars'
    }, { status: 500 })
  }
}