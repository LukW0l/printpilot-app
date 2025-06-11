import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId } = body

    console.log('🗑️ Deleting shipment for order:', orderId)

    // Get order from database
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { shipments: true }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    console.log('📦 Order found:', order.externalId, 'with', order.shipments.length, 'shipments')

    // Delete all shipment records for this order
    await prisma.shipment.deleteMany({
      where: { orderId: orderId }
    })

    // Clear tracking info from order
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        trackingNumber: null,
        shippingProvider: null,
        // Don't change order status - keep it as is
      }
    })

    console.log('✅ Shipment data cleared for order:', order.externalId)

    return NextResponse.json({
      success: true,
      message: 'Shipment data deleted successfully',
      order: updatedOrder
    })

  } catch (error) {
    console.error('💥 Error deleting shipment:', error)
    return NextResponse.json(
      { 
        error: 'Failed to delete shipment', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}