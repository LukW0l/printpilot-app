import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { items, actualDeliveryDate, notes } = body
    const orderId = params.id

    if (!items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Items are required for delivery verification' },
        { status: 400 }
      )
    }

    // Verify order exists and is in correct status
    const order = await prisma.supplierOrder.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true
          }
        },
        supplier: true
      }
    })

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }

    if (!['SENT', 'CONFIRMED'].includes(order.status)) {
      return NextResponse.json(
        { success: false, error: 'Order must be in SENT or CONFIRMED status to mark as delivered' },
        { status: 400 }
      )
    }

    // Update order items with received quantities
    const result = await prisma.$transaction(async (tx) => {
      const updatedItems = []
      let allItemsFullyReceived = true

      for (const deliveryItem of items) {
        const orderItem = order.items.find(item => item.id === deliveryItem.itemId)
        if (!orderItem) {
          throw new Error(`Order item ${deliveryItem.itemId} not found`)
        }

        const receivedQuantity = parseInt(deliveryItem.receivedQuantity)
        const isFullyReceived = receivedQuantity >= orderItem.quantity

        if (!isFullyReceived) {
          allItemsFullyReceived = false
        }

        // Update order item
        const updatedItem = await tx.supplierOrderItem.update({
          where: { id: deliveryItem.itemId },
          data: {
            received: isFullyReceived,
            receivedQuantity,
            receivedAt: new Date()
          },
          include: {
            product: true
          }
        })

        updatedItems.push(updatedItem)

        // Update inventory for frame products
        if (order.supplier.category === 'FRAMES') {
          await updateFrameInventory(tx, orderItem.product, receivedQuantity)
        }
      }

      // Update order status
      const newStatus = allItemsFullyReceived ? 'DELIVERED' : 'PARTIALLY_DELIVERED'
      const updatedOrder = await tx.supplierOrder.update({
        where: { id: orderId },
        data: {
          status: newStatus,
          actualDelivery: actualDeliveryDate ? new Date(actualDeliveryDate) : new Date(),
          internalNotes: notes,
          updatedAt: new Date()
        },
        include: {
          supplier: true,
          items: {
            include: {
              product: true
            }
          }
        }
      })

      return {
        order: updatedOrder,
        updatedItems,
        allItemsReceived: allItemsFullyReceived
      }
    })

    return NextResponse.json({
      success: true,
      data: result,
      message: result.allItemsReceived 
        ? 'All items delivered and inventory updated' 
        : 'Partial delivery processed'
    })

  } catch (error: any) {
    console.error('Error processing delivery:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process delivery' },
      { status: 500 }
    )
  }
}

// Helper function to update frame inventory
async function updateFrameInventory(tx: any, product: any, receivedQuantity: number) {
  if (product.category === 'FRAME_STRIPS') {
    // Update stretcher bar inventory
    const frameType = product.name.toLowerCase().includes('gruba') ? 'THICK' : 'THIN'
    
    await tx.stretcherBarInventory.upsert({
      where: {
        length_type: {
          length: product.width || 0,
          type: frameType
        }
      },
      update: {
        stock: {
          increment: receivedQuantity
        }
      },
      create: {
        length: product.width || 0,
        type: frameType,
        stock: receivedQuantity,
        minStock: 10
      }
    })
    
    console.log(`✅ Dodano do magazynu: ${receivedQuantity}x ${product.name} (${product.width}cm, ${frameType})`)
    
  } else if (product.category === 'CROSSBARS') {
    // Update crossbar inventory
    await tx.crossbarInventory.upsert({
      where: {
        length: product.width || 0
      },
      update: {
        stock: {
          increment: receivedQuantity
        }
      },
      create: {
        length: product.width || 0,
        stock: receivedQuantity,
        minStock: 5
      }
    })
    
    console.log(`✅ Dodano do magazynu: ${receivedQuantity}x ${product.name} (${product.width}cm)`)
    
  } else if (product.category === 'FRAME_KITS') {
    // Rozbij kompletny zestaw na komponenty i dodaj do magazynu
    if (product.width && product.height) {
      const frameType = product.name.toLowerCase().includes('grub') ? 'THICK' : 'THIN'
      
      // Dodaj listwy poziome (2 sztuki o długości = width)
      await tx.stretcherBarInventory.upsert({
        where: {
          length_type: {
            length: product.width,
            type: frameType
          }
        },
        update: {
          stock: {
            increment: receivedQuantity * 2 // 2 listwy poziome na zestaw
          }
        },
        create: {
          length: product.width,
          type: frameType,
          stock: receivedQuantity * 2,
          minStock: 10
        }
      })
      
      // Dodaj listwy pionowe (2 sztuki o długości = height)
      await tx.stretcherBarInventory.upsert({
        where: {
          length_type: {
            length: product.height,
            type: frameType
          }
        },
        update: {
          stock: {
            increment: receivedQuantity * 2 // 2 listwy pionowe na zestaw
          }
        },
        create: {
          length: product.height,
          type: frameType,
          stock: receivedQuantity * 2,
          minStock: 10
        }
      })
      
      // Dodaj poprzeczki jeśli zestaw ma crossbars
      const crossbarCount = product.name.toLowerCase().includes('krzyżak') ? 2 : 1
      const crossbarLength = Math.min(product.width, product.height) // Krótsza z długości
      
      await tx.crossbarInventory.upsert({
        where: {
          length: crossbarLength
        },
        update: {
          stock: {
            increment: receivedQuantity * crossbarCount
          }
        },
        create: {
          length: crossbarLength,
          stock: receivedQuantity * crossbarCount,
          minStock: 5
        }
      })
      
      console.log(`✅ Rozbito zestaw ramowy ${product.name}:`)
      console.log(`   - ${receivedQuantity * 2}x listwy ${frameType} ${product.width}cm`)
      console.log(`   - ${receivedQuantity * 2}x listwy ${frameType} ${product.height}cm`)
      console.log(`   - ${receivedQuantity * crossbarCount}x poprzeczki ${crossbarLength}cm`)
    }
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id

    const order = await prisma.supplierOrder.findUnique({
      where: { id: orderId },
      include: {
        supplier: true,
        items: {
          include: {
            product: true
          }
        }
      }
    })

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: order
    })

  } catch (error: any) {
    console.error('Error fetching order for delivery:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch order' },
      { status: 500 }
    )
  }
}