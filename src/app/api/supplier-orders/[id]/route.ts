import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const { id } = params
    const body = await request.json()
    const { status } = body

    if (!status) {
      return NextResponse.json(
        { success: false, error: 'Status is required' },
        { status: 400 }
      )
    }

    // Aktualizuj status zamówienia
    const updatedOrder = await prisma.supplier_orders.update({
      where: { id },
      data: { 
        status,
        updatedAt: new Date()
      },
      include: {
        suppliers: true,
        supplier_order_items: {
          include: {
            supplier_products: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      message: `Status zamówienia zmieniony na: ${status}`
    })

  } catch (error: any) {
    console.error('Error updating supplier orders:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update order' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const { id } = params

    const order = await prisma.supplier_orders.findUnique({
      where: { id },
      include: {
        suppliers: true,
        supplier_order_items: {
          include: {
            supplier_products: true
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
    console.error('Error fetching supplier orders:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch order' },
      { status: 500 }
    )
  }
}