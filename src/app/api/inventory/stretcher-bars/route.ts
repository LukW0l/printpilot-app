import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAvailableStretcherBarLengths } from '@/lib/frame-calculator'
import { randomBytes } from 'crypto'

function generateId() {
  return randomBytes(12).toString('base64url')
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as 'THIN' | 'THICK' | null
    
    const where: any = {}
    if (type) where.type = type
    
    const inventory = await prisma.stretcher_bar_inventory.findMany({
      where,
      orderBy: [
        { type: 'asc' },
        { length: 'asc' }
      ]
    })
    
    return NextResponse.json(inventory)
  } catch (error) {
    console.error('Error fetching stretcher bar inventory:', error)
    return NextResponse.json(
      { error: 'Failed to fetch inventory' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, length, stock, minStock } = body
    
    // Validate inputs
    if (!type || !['THIN', 'THICK'].includes(type)) {
      return NextResponse.json(
        { error: 'Valid type (THIN or THICK) is required' },
        { status: 400 }
      )
    }
    
    if (!length || length < 30) {
      return NextResponse.json(
        { error: 'Length must be at least 30cm' },
        { status: 400 }
      )
    }
    
    // Check if length is available for this type
    const availableLengths = getAvailableStretcherBarLengths(type)
    if (!availableLengths.includes(length)) {
      return NextResponse.json(
        { error: `Length ${length}cm is not available for ${type} stretcher bars` },
        { status: 400 }
      )
    }
    
    const inventory = await prisma.stretcher_bar_inventory.upsert({
      where: {
        length_type: {
          length,
          type
        }
      },
      update: {
        stock: stock || 0,
        minStock: minStock || 0
      },
      create: {
        id: generateId(),
        type,
        length,
        stock: stock || 0,
        minStock: minStock || 0,
        updatedAt: new Date()
      }
    })
    
    return NextResponse.json(inventory, { status: 201 })
  } catch (error) {
    console.error('Error creating/updating stretcher bar inventory:', error)
    return NextResponse.json(
      { error: 'Failed to create/update inventory' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, stock, minStock } = body
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      )
    }
    
    const inventory = await prisma.stretcher_bar_inventory.update({
      where: { id },
      data: {
        ...(stock !== undefined && { stock }),
        ...(minStock !== undefined && { minStock })
      }
    })
    
    return NextResponse.json(inventory)
  } catch (error) {
    console.error('Error updating stretcher bar inventory:', error)
    return NextResponse.json(
      { error: 'Failed to update inventory' },
      { status: 500 }
    )
  }
}