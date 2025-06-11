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
    const updatedOrder = await prisma.supplierOrder.update({
      where: { id },
      data: { 
        status,
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

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      message: `Status zamówienia zmieniony na: ${status}`
    })

  } catch (error: any) {
    console.error('Error updating supplier order:', error)
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

    const order = await prisma.supplierOrder.findUnique({
      where: { id },
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
    console.error('Error fetching supplier order:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch order' },
      { status: 500 }
    )
  }
}