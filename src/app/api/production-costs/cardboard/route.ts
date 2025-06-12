import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/generated/prisma'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const cardboards = await prisma.cardboard_inventory.findMany({
      orderBy: [
        { width: 'asc' },
        { height: 'asc' }
      ]
    })
    return NextResponse.json(cardboards)
  } catch (error) {
    console.error('Error fetching cardboard inventory:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, stock, price, minStock } = await request.json()

    const cardboard = await prisma.cardboard_inventory.update({
      where: { id },
      data: {
        ...(stock !== undefined && { stock }),
        ...(price !== undefined && { price }),
        ...(minStock !== undefined && { minStock })
      }
    })

    return NextResponse.json(cardboard)
  } catch (error) {
    console.error('Error updating cardboard inventory:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}