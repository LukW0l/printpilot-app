import { NextRequest, NextResponse } from 'next/server'
import { calculateProductionCost } from '@/lib/production-cost-calculator'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('API received:', body)
    
    const { dimensions, options } = body

    if (!dimensions) {
      console.log('No dimensions provided')
      return NextResponse.json(
        { error: 'Dimensions are required' },
        { status: 400 }
      )
    }

    console.log('Calculating cost for dimensions:', dimensions, 'with options:', options)
    const result = await calculateProductionCost(dimensions, options)
    console.log('Calculation result:', result)

    if (!result) {
      console.log('No result from calculation')
      return NextResponse.json(
        { error: 'Invalid dimensions format' },
        { status: 400 }
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error calculating production cost:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}