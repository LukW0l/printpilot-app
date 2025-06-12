import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { frameRequirementIds, supplierId } = body

    if (!frameRequirementIds || !Array.isArray(frameRequirementIds) || frameRequirementIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Frame requirement IDs are required' },
        { status: 400 }
      )
    }

    // Get frame requirements with details
    const frameRequirements = await prisma.frame_requirements.findMany({
      where: {
        id: { in: frameRequirementIds }
      },
      include: {
        order_items: {
          include: {
            orders: true
          }
        }
      }
    })

    if (frameRequirements.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No frame requirements found' },
        { status: 404 }
      )
    }

    // Aggregate material needs
    const materialNeeds: Record<string, { type: 'THIN' | 'THICK', length: number, quantity: number }> = {}
    const crossbarNeeds: Record<number, number> = {}

    for (const req of frameRequirements) {
      const orderQuantity = req.order_items.quantity

      // Stretcher bars
      const widthKey = `${req.frameType}-${req.width}`
      const heightKey = `${req.frameType}-${req.height}`

      if (!materialNeeds[widthKey]) {
        materialNeeds[widthKey] = { type: req.frameType, length: req.width, quantity: 0 }
      }
      if (!materialNeeds[heightKey]) {
        materialNeeds[heightKey] = { type: req.frameType, length: req.height, quantity: 0 }
      }

      materialNeeds[widthKey].quantity += req.widthBars * orderQuantity
      materialNeeds[heightKey].quantity += req.heightBars * orderQuantity

      // Crossbars
      if (req.crossbars > 0 && req.crossbarLength) {
        if (!crossbarNeeds[req.crossbarLength]) {
          crossbarNeeds[req.crossbarLength] = 0
        }
        crossbarNeeds[req.crossbarLength] += req.crossbars * orderQuantity
      }
    }

    // Find supplier (use Tempich if not specified)
    let targetSupplierId = supplierId
    if (!targetSupplierId) {
      const tempichSupplier = await prisma.suppliers.findFirst({
        where: { name: 'Tempich', category: 'FRAMES', isActive: true }
      })
      if (!tempichSupplier) {
        return NextResponse.json(
          { success: false, error: 'No frame supplier found' },
          { status: 404 }
        )
      }
      targetSupplierId = tempichSupplier.id
    }

    // Get supplier products
    const supplierProducts = await prisma.supplier_products.findMany({
      where: {
        supplierId: targetSupplierId,
        category: 'FRAME_STRIPS',
        inStock: true
      }
    })

    if (supplierProducts.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No frame products found for supplier' },
        { status: 404 }
      )
    }

    // Match needed materials with available products
    const orderItems: Array<{
      productId: string
      productName: string
      quantity: number
      unitPrice: number
      totalPrice: number
    }> = []

    // Process stretcher bars
    for (const [key, need] of Object.entries(materialNeeds)) {
      const product = supplierProducts.find(p => {
        const isCorrectType = (need.type === 'THIN' && p.name.toLowerCase().includes('cienka')) ||
                             (need.type === 'THICK' && p.name.toLowerCase().includes('gruba'))
        const isCorrectLength = p.width === need.length || p.name.includes(`${need.length}cm`)
        return isCorrectType && isCorrectLength
      })

      if (product) {
        // Add safety margin (20% extra)
        const quantityWithMargin = Math.ceil(need.quantity * 1.2)
        
        orderItems.push({
          productId: product.id,
          productName: product.name,
          quantity: quantityWithMargin,
          unitPrice: Number(product.unitPrice),
          totalPrice: quantityWithMargin * Number(product.unitPrice)
        })
      }
    }

    // Process crossbars - find appropriate products or suggest ordering separately
    const crossbarSuggestions: string[] = []
    for (const [length, quantity] of Object.entries(crossbarNeeds)) {
      crossbarSuggestions.push(`${length}cm crossbars: ${quantity} szt`)
    }

    if (orderItems.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No matching products found for required materials',
        details: {
          materialNeeds,
          crossbarNeeds,
          availableProducts: supplierProducts.map(p => ({ name: p.name, sku: p.sku }))
        }
      }, { status: 400 })
    }

    // Generate suggested order
    const totalAmount = orderItems.reduce((sum, item) => sum + item.totalPrice, 0)
    
    const orderSuggestion = {
      supplierId: targetSupplierId,
      order_items: orderItems,
      totalAmount,
      currency: 'PLN',
      notes: `Auto-generated order for frame requirements:\n${frameRequirements.map(req => 
        `- Order ${req.order_items.orders.externalId}: ${req.width}×${req.height}cm ${req.frameType} (qty: ${req.order_items.quantity})`
      ).join('\n')}\n\nCrossbars needed separately:\n${crossbarSuggestions.join('\n')}`,
      frameRequirementIds,
      materialNeeds,
      crossbarNeeds: crossbarSuggestions
    }

    return NextResponse.json({
      success: true,
      data: orderSuggestion,
      message: `Generated order suggestion for ${frameRequirements.length} frame requirements`
    })

  } catch (error: any) {
    console.error('Error generating auto-orders:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate auto-order' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get frame requirements that might need materials ordered
    const frameRequirements = await prisma.frame_requirements.findMany({
      where: {
        frameStatus: 'NOT_PREPARED',
        order_items: {
          orders: {
            status: 'PROCESSING'
          }
        }
      },
      include: {
        order_items: {
          include: {
            orders: true
          }
        }
      }
    })

    // Check which ones lack materials
    const requirementsNeedingMaterials = []

    for (const req of frameRequirements) {
      const orderQuantity = req.order_items.quantity

      // Check stretcher bar availability
      const stretcherBarsNeeded = [
        { length: req.width, type: req.frameType, quantity: req.widthBars * orderQuantity },
        { length: req.height, type: req.frameType, quantity: req.heightBars * orderQuantity }
      ]

      let materialsMissing = false
      const missingMaterials: string[] = []

      for (const bar of stretcherBarsNeeded) {
        const inventory = await prisma.stretcher_bar_inventory.findUnique({
          where: {
            length_type: {
              length: bar.length,
              type: bar.type
            }
          }
        })

        if (!inventory || inventory.stock < bar.quantity) {
          materialsMissing = true
          missingMaterials.push(`${bar.length}cm ${bar.type} (need: ${bar.quantity}, have: ${inventory?.stock || 0})`)
        }
      }

      // Check crossbar availability
      if (req.crossbars > 0 && req.crossbarLength) {
        const crossbarInventory = await prisma.crossbar_inventory.findUnique({
          where: { length: req.crossbarLength }
        })

        const neededCrossbars = req.crossbars * orderQuantity
        if (!crossbarInventory || crossbarInventory.stock < neededCrossbars) {
          materialsMissing = true
          missingMaterials.push(`${req.crossbarLength}cm crossbars (need: ${neededCrossbars}, have: ${crossbarInventory?.stock || 0})`)
        }
      }

      if (materialsMissing) {
        requirementsNeedingMaterials.push({
          id: req.id,
          orderExternalId: req.order_items.orders.externalId,
          customerName: req.order_items.orders.customerName,
          itemName: req.order_items.name,
          dimensions: `${req.width}×${req.height}cm`,
          frameType: req.frameType,
          quantity: orderQuantity,
          missingMaterials
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        requirementsNeedingMaterials,
        totalRequirements: frameRequirements.length,
        needingMaterials: requirementsNeedingMaterials.length
      }
    })

  } catch (error: any) {
    console.error('Error checking material needs:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to check material needs' },
      { status: 500 }
    )
  }
}