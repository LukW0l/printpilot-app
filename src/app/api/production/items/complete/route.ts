import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'

function generateId() {
  return randomBytes(12).toString('base64url')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      orderItemId, 
      productionTimerId, 
      operationType, 
      operatorName,
      notes,
      completedCount = 1 
    } = body

    if (!orderItemId || !operationType) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Get the order item
      const orderItem = await tx.order_items.findUnique({
        where: { id: orderItemId },
        include: { orders: true }
      })

      if (!orderItem) {
        throw new Error('Order item not found')
      }

      // Create completion record
      const completion = await tx.item_completions.create({
        data: {
          id: generateId(),
          orderItemId,
          productionTimerId,
          operationType,
          operatorName,
          notes
        }
      })

      // Update completed count
      const newCompletedCount = orderItem.completedCount + completedCount
      const isFullyCompleted = newCompletedCount >= orderItem.quantity

      // Update order item
      const updatedOrderItem = await tx.order_items.update({
        where: { id: orderItemId },
        data: {
          completedCount: newCompletedCount,
          completionStatus: isFullyCompleted 
            ? 'COMPLETED' 
            : 'IN_PROGRESS',
          // Also update print status if this is a printing operation
          ...(operationType === 'PRINTING' && isFullyCompleted && {
            printStatus: 'PRINTED',
            printedAt: new Date()
          })
        }
      })

      // Check if all items in the order are completed
      const allOrderItems = await tx.order_items.findMany({
        where: { orderId: orderItem.orderId }
      })

      const allCompleted = allOrderItems.every(
        item => item.completionStatus === 'COMPLETED'
      )

      // Update order status if all items are completed
      if (allCompleted) {
        await tx.orders.update({
          where: { id: orderItem.orderId },
          data: {
            status: 'PRINTED',
            updatedAt: new Date()
          }
        })
      }

      return {
        completion,
        order_items: updatedOrderItem,
        remainingCount: orderItem.quantity - newCompletedCount,
        isFullyCompleted,
        allOrderItemsCompleted: allCompleted
      }
    })

    return NextResponse.json({ 
      success: true, 
      data: result 
    })

  } catch (error: any) {
    console.error('Error completing item:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to complete item' },
      { status: 500 }
    )
  }
}

// Get completion history for an order item
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderItemId = searchParams.get('orderItemId')
    const orderId = searchParams.get('orderId')

    if (!orderItemId && !orderId) {
      return NextResponse.json(
        { success: false, error: 'Order item ID or order ID required' },
        { status: 400 }
      )
    }

    let completions: any[]

    if (orderItemId) {
      // Get completions for specific item
      completions = await prisma.item_completions.findMany({
        where: { orderItemId: orderItemId },
        include: {
          order_items: true,
          production_timers: true
        },
        orderBy: { completedAt: 'desc' }
      })
    } else if (orderId) {
      // Get all completions for an order
      const orderItems = await prisma.order_items.findMany({
        where: { orderId: orderId },
        select: { id: true }
      })

      completions = await prisma.item_completions.findMany({
        where: {
          orderItemId: { in: orderItems.map(item => item.id) }
        },
        include: {
          order_items: true,
          production_timers: true
        },
        orderBy: { completedAt: 'desc' }
      })
    } else {
      completions = []
    }

    return NextResponse.json({ 
      success: true, 
      data: completions 
    })

  } catch (error: any) {
    console.error('Error fetching completions:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch completions' },
      { status: 500 }
    )
  }
}