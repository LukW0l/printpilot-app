import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting print status synchronization...')
    
    // Find all orders with PRINTED status
    const printedOrders = await prisma.order.findMany({
      where: { status: 'PRINTED' },
      include: { items: true }
    })
    
    let updatedItemsCount = 0
    let checkedOrdersCount = 0
    
    for (const order of printedOrders) {
      checkedOrdersCount++
      console.log(`📋 Checking order ${order.externalId}...`)
      
      // Find items that are not marked as PRINTED yet
      const notPrintedItems = order.items.filter(item => item.printStatus !== 'PRINTED')
      
      if (notPrintedItems.length > 0) {
        console.log(`   Found ${notPrintedItems.length} non-printed items in printed order`)
        
        // Update all items to PRINTED status
        await prisma.orderItem.updateMany({
          where: {
            orderId: order.id,
            printStatus: { not: 'PRINTED' }
          },
          data: {
            printStatus: 'PRINTED',
            printedAt: new Date()
          }
        })
        
        updatedItemsCount += notPrintedItems.length
        console.log(`   ✅ Updated ${notPrintedItems.length} items to PRINTED`)
      }
    }
    
    console.log(`🎉 Synchronization complete: ${updatedItemsCount} items updated across ${checkedOrdersCount} orders`)
    
    // Verify the sync worked by checking a sample
    const verifyOrder = await prisma.order.findFirst({
      where: { status: 'PRINTED' },
      include: { items: true }
    })
    
    if (verifyOrder) {
      console.log(`🔍 Verification - Order ${verifyOrder.externalId} items:`, 
        verifyOrder.items.map(item => ({ name: item.name, printStatus: item.printStatus })))
    }
    
    return NextResponse.json({
      success: true,
      message: `Synchronized ${updatedItemsCount} items across ${checkedOrdersCount} orders`,
      updatedItems: updatedItemsCount,
      checkedOrders: checkedOrdersCount
    })
    
  } catch (error) {
    console.error('Error synchronizing print status:', error)
    return NextResponse.json(
      { error: 'Failed to synchronize print status' },
      { status: 500 }
    )
  }
}