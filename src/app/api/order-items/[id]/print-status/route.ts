import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { printStatus } = body

    const item = await prisma.orderItem.update({
      where: { id },
      data: {
        printStatus,
        printedAt: printStatus === 'PRINTED' ? new Date() : null
      }
    })

    // Check if all items in the order are printed
    const order = await prisma.order.findUnique({
      where: { id: item.orderId },
      include: { items: true }
    })

    if (order) {
      const allItemsPrinted = order.items.every(i => 
        i.id === item.id ? printStatus === 'PRINTED' : i.printStatus === 'PRINTED'
      )

      // Update order status if all items are printed
      if (allItemsPrinted && order.status === 'PROCESSING') {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: 'PRINTED' }
        })
      } else if (!allItemsPrinted && order.status === 'PRINTED') {
        // Revert order status if not all items are printed
        await prisma.order.update({
          where: { id: order.id },
          data: { status: 'PROCESSING' }
        })
      }
    }

    return NextResponse.json({ success: true, item })
  } catch (error) {
    console.error('Error updating item print status:', error)
    return NextResponse.json(
      { error: 'Failed to update print status' },
      { status: 500 }
    )
  }
}