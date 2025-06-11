import { NextRequest, NextResponse } from 'next/server'
import { getShippingService } from '@/lib/shipping-providers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { sender, receiver } = body

    if (!sender || !receiver) {
      return NextResponse.json(
        { error: 'Sender and receiver addresses are required' },
        { status: 400 }
      )
    }

    const shippingService = getShippingService()
    const rates = await shippingService.getRates(sender, receiver)

    return NextResponse.json({ rates })
  } catch (error) {
    console.error('Shipping rates error:', error)
    return NextResponse.json(
      { error: 'Failed to get shipping rates' },
      { status: 500 }
    )
  }
}