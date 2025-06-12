import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, platform, url, apiKey, apiSecret, isActive } = body

    // Build update data object, only including apiKey/apiSecret if provided
    const updateData: any = {
      name,
      platform,
      url,
      isActive
    }
    
    // Only update credentials if they are provided (not empty strings)
    if (apiKey) {
      updateData.apiKey = apiKey
    }
    if (apiSecret) {
      updateData.apiSecret = apiSecret
    }

    const shop = await prisma.shops.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json(shop)
  } catch (error) {
    console.error('Error updating shop:', error)
    return NextResponse.json(
      { error: 'Failed to update shop' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // First check if shop has any orders
    const shop = await prisma.shops.findUnique({
      where: { id },
      include: {
        _count: {
          select: { orders: true }
        }
      }
    })

    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }

    if (shop._count.orders > 0) {
      return NextResponse.json(
        { error: 'Cannot delete shop with existing orders' },
        { status: 400 }
      )
    }

    await prisma.shops.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting shop:', error)
    return NextResponse.json(
      { error: 'Failed to delete shop' },
      { status: 500 }
    )
  }
}