import { NextRequest, NextResponse } from 'next/server'
import { saveProductionCostForOrder } from '@/lib/production-cost-calculator'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const costResult = await request.json()
    
    await saveProductionCostForOrder(resolvedParams.id, costResult)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving production cost:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}