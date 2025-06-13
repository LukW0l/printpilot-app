import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'

function generateId() {
  return randomBytes(12).toString('base64url')
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const status = searchParams.get('status')
    const supplierId = searchParams.get('supplierId')

    const where: any = {}
    
    if (category) {
      where.suppliers = {
        category: category
      }
    }

    if (status) {
      where.status = status
    }

    if (supplierId) {
      where.supplierId = supplierId
    }

    const orders = await prisma.supplier_orders.findMany({
      where,
      include: {
        suppliers: {
          select: {
            name: true,
            city: true,
            category: true
          }
        },
        supplier_order_items: {
          include: {
            supplier_products: {
              select: {
                name: true,
                sku: true,
                category: true,
                width: true,
                height: true
              }
            }
          }
        }
      },
      orderBy: {
        orderDate: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      data: orders
    })
  } catch (error: any) {
    console.error('Error fetching supplier orders:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch supplier orders' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { supplierId, items, notes, expectedDelivery } = body

    if (!supplierId || !items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Supplier ID and items are required' },
        { status: 400 }
      )
    }

    // Generate order number
    const orderCount = await prisma.supplier_orders.count()
    const orderNumber = `SUP-${new Date().getFullYear()}-${String(orderCount + 1).padStart(4, '0')}`

    // Calculate total amount
    const totalAmount = items.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0)

    // Create order with items in transaction
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.supplier_orders.create({
        data: {
          id: generateId(),
          supplierId,
          orderNumber,
          status: 'DRAFT',
          totalAmount,
          currency: 'PLN',
          expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : null,
          notes,
          paymentStatus: 'PENDING',
          updatedAt: new Date()
        }
      })

      // Create order items
      await tx.supplier_order_items.createMany({
        data: items.map((item: any) => ({
          orderId: newOrder.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.quantity * item.unitPrice
        }))
      })

      return newOrder
    })

    // Fetch complete order with relations
    const completeOrder = await prisma.supplier_orders.findUnique({
      where: { id: order.id },
      include: {
        suppliers: {
          select: {
            name: true,
            city: true,
            category: true
          }
        },
        supplier_order_items: {
          include: {
            supplier_products: {
              select: {
                name: true,
                sku: true,
                category: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: completeOrder
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating supplier orders:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create supplier order' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId, status, actualDelivery, notes } = body

    if (!orderId || !status) {
      return NextResponse.json(
        { success: false, error: 'Order ID and status are required' },
        { status: 400 }
      )
    }

    const updateData: any = {
      status,
      updatedAt: new Date()
    }

    if (actualDelivery) {
      updateData.actualDelivery = new Date(actualDelivery)
    }

    if (notes !== undefined) {
      updateData.notes = notes
    }

    // Update payment status based on order status
    if (status === 'DELIVERED') {
      updateData.paymentStatus = 'PAID'
      updateData.paidAt = new Date()
    }

    const updatedOrder = await prisma.supplier_orders.update({
      where: { id: orderId },
      data: updateData,
      include: {
        suppliers: {
          select: {
            name: true,
            city: true,
            category: true
          }
        },
        supplier_order_items: {
          include: {
            supplier_products: {
              select: {
                name: true,
                sku: true,
                category: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedOrder
    })
  } catch (error: any) {
    console.error('Error updating supplier orders:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update supplier order' },
      { status: 500 }
    )
  }
}