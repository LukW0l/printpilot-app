import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const frameKits = await prisma.frameKit.findMany({
      where: { isActive: true },
      orderBy: [
        { frameType: 'asc' },
        { width: 'asc' },
        { height: 'asc' }
      ]
    })

    return NextResponse.json({
      success: true,
      data: frameKits
    })
  } catch (error: any) {
    console.error('Error fetching frame kits:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch frame kits' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, width, height, frameType, crossbars, description } = body

    if (!name || !width || !height || !frameType) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const frameKit = await prisma.frameKit.create({
      data: {
        name,
        width: parseInt(width),
        height: parseInt(height),
        frameType,
        crossbars: parseInt(crossbars) || 1,
        description,
        isActive: true
      }
    })

    return NextResponse.json({
      success: true,
      data: frameKit
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating frame kit:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create frame kit' },
      { status: 500 }
    )
  }
}