import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAvailableCrossbarLengths } from '@/lib/frame-calculator'
import { randomBytes } from 'crypto'

function generateId() {
  return randomBytes(12).toString('base64url')
}

export async function GET() {
  try {
    const inventory = await prisma.crossbar_inventory.findMany({
      orderBy: { length: 'asc' }
    })
    
    return NextResponse.json(inventory)
  } catch (error) {
    console.error('Error fetching crossbar inventory:', error)
    return NextResponse.json(
      { error: 'Failed to fetch inventory' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { length, stock, minStock } = body
    
    // Validate inputs
    if (!length || length < 30) {
      return NextResponse.json(
        { error: 'Length must be at least 30cm' },
        { status: 400 }
      )
    }
    
    // Check if length is available
    const availableLengths = getAvailableCrossbarLengths()
    if (!availableLengths.includes(length)) {
      return NextResponse.json(
        { error: `Length ${length}cm is not available for crossbars` },
        { status: 400 }
      )
    }
    
    const inventory = await prisma.crossbar_inventory.upsert({
      where: { length },
      update: {
        stock: stock || 0,
        minStock: minStock || 0
      },
      create: {
        id: generateId(),
        length,
        stock: stock || 0,
        minStock: minStock || 0,
        updatedAt: new Date()
      }
    })
    
    return NextResponse.json(inventory, { status: 201 })
  } catch (error) {
    console.error('Error creating/updating crossbar inventory:', error)
    return NextResponse.json(
      { error: 'Failed to create/update inventory' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('PATCH crossbar request body:', body)
    const { id, stock, minStock } = body
    
    if (!id) {
      console.log('Missing ID in request')
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      )
    }
    
    console.log('Attempting to update crossbar:', { id, stock, minStock })
    
    const inventory = await prisma.crossbar_inventory.update({
      where: { id },
      data: {
        ...(stock !== undefined && { stock }),
        ...(minStock !== undefined && { minStock })
      }
    })
    
    console.log('Successfully updated crossbar:', inventory)
    return NextResponse.json(inventory)
  } catch (error) {
    console.error('Error updating crossbar inventory - full error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error message:', errorMessage)
    return NextResponse.json(
      { error: 'Failed to update inventory', details: errorMessage },
      { status: 500 }
    )
  }
}