import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function PATCH(
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
    const { frameStatus, assignedTo } = body

    // Update frame requirement status
    const updatedFrameRequirement = await prisma.frame_requirements.update({
      where: { id },
      data: {
        frameStatus,
        preparedAt: frameStatus === 'PREPARED' ? new Date() : undefined
      }
    })

    return NextResponse.json(updatedFrameRequirement)
  } catch (error) {
    console.error('Error updating frame requirement:', error)
    return NextResponse.json(
      { error: 'Failed to update frame requirement' },
      { status: 500 }
    )
  }
}