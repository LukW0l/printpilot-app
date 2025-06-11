import { NextRequest, NextResponse } from 'next/server'
import { syncShopOrders } from '@/lib/woocommerce'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ shopId: string }> }
) {
  try {
    const { shopId } = await params
    console.log('Starting sync for shop:', shopId)
    const syncedOrders = await syncShopOrders(shopId)
    
    return NextResponse.json({
      success: true,
      message: `Successfully synced ${syncedOrders.length} orders`,
      orders: syncedOrders,
      count: syncedOrders.length
    })
  } catch (error) {
    console.error('Sync error details:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}