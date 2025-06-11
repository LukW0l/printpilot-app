import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getApaczkaAPI } from '@/lib/apaczka'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId, trackingNumber } = body

    console.log('📍 Checking shipment status for:', { orderId, trackingNumber })

    // Get order and shipment from database
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { shipments: true }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const shipment = order.shipments.find(s => s.trackingNumber === trackingNumber)
    if (!shipment) {
      return NextResponse.json({ 
        error: 'Shipment not found' 
      }, { status: 404 })
    }

    // Get provider order ID from providerOrderId field or extract from providerResponse
    let providerOrderId = shipment.providerOrderId
    if (!providerOrderId && shipment.providerResponse) {
      try {
        const response = JSON.parse(shipment.providerResponse)
        providerOrderId = response.response?.order?.id?.toString()
      } catch (error) {
        console.error('Failed to parse provider response:', error)
      }
    }

    if (!providerOrderId) {
      return NextResponse.json({ 
        error: 'Missing provider order ID in shipment data' 
      }, { status: 404 })
    }

    // Get status from Apaczka API
    const apaczka = await getApaczkaAPI()
    const apaczkaStatus = await apaczka.getShipmentStatus(providerOrderId)
    
    console.log('📦 Apaczka status response:', apaczkaStatus)

    // Map Apaczka status to our internal status
    const apaczkaOrderStatus = apaczkaStatus.status || apaczkaStatus.response?.order?.status
    console.log('📊 Apaczka order status:', apaczkaOrderStatus)
    
    const mappedStatus = mapApaczkaStatus(apaczkaOrderStatus)
    const previousStatus = order.status

    // Update order status if it changed
    let updatedOrder = order
    if (shouldUpdateOrderStatus(previousStatus, mappedStatus)) {
      const orderUpdate = await prisma.order.update({
        where: { id: orderId },
        data: { status: mappedStatus as any },
        include: { shipments: true }
      })
      updatedOrder = orderUpdate
      console.log(`📊 Order status updated: ${previousStatus} → ${mappedStatus}`)
    }

    // Update shipment with latest status info
    const updatedShipment = await prisma.shipment.update({
      where: { id: shipment.id },
      data: {
        status: apaczkaOrderStatus || shipment.status,
        lastChecked: new Date(),
        providerResponse: JSON.stringify(apaczkaStatus)
      }
    })

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      shipment: updatedShipment,
      apaczkaStatus,
      statusChanged: previousStatus !== mappedStatus,
      previousStatus,
      newStatus: mappedStatus
    })

  } catch (error) {
    console.error('💥 Error checking shipment status:', error)
    return NextResponse.json(
      { 
        error: 'Failed to check shipment status', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

// Map Apaczka statuses to our internal order statuses
function mapApaczkaStatus(apaczkaStatus: string): string {
  const statusMapping: Record<string, string> = {
    'NEW': 'PRINTED',           // Nowe zamówienie w Apaczka = Printed u nas
    'READY_TO_SHIP': 'PRINTED', // Gotowe do wysłania = Printed
    'PICKED_UP': 'SHIPPED',      // Odebrane przez kuriera = Wysłane
    'IN_TRANSIT': 'SHIPPED',     // W transporcie = Wysłane
    'OUT_FOR_DELIVERY': 'SHIPPED', // W doręczeniu = Wysłane
    'DELIVERED': 'DELIVERED',    // Dostarczone = Dostarczone
    'RETURNED': 'CANCELLED',     // Zwrócone = Anulowane
    'CANCELLED': 'CANCELLED'     // Anulowane = Anulowane
  }
  
  return statusMapping[apaczkaStatus] || 'PRINTED'
}

// Determine if order status should be updated based on status progression
function shouldUpdateOrderStatus(currentStatus: string, newStatus: string): boolean {
  // Define status hierarchy (higher number = more advanced)
  const statusHierarchy: Record<string, number> = {
    'NEW': 1,
    'PROCESSING': 2,
    'PRINTED': 3,
    'SHIPPED': 4,
    'DELIVERED': 5,
    'CANCELLED': 0
  }
  
  const currentLevel = statusHierarchy[currentStatus] || 0
  const newLevel = statusHierarchy[newStatus] || 0
  
  // Only update if new status is more advanced than current
  // Exception: always allow updates to CANCELLED/DELIVERED
  return newLevel > currentLevel || ['CANCELLED', 'DELIVERED'].includes(newStatus)
}

// GET endpoint to check all active shipments
export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Bulk checking shipment statuses...')

    // Get all orders with active shipments (PRINTED or SHIPPED status)
    const ordersWithShipments = await prisma.order.findMany({
      where: {
        status: { in: ['PRINTED', 'SHIPPED'] },
        trackingNumber: { not: null }
      },
      include: { shipments: true },
      take: 50 // Limit to avoid rate limiting
    })

    console.log(`📦 Found ${ordersWithShipments.length} orders with active shipments`)

    let updated = 0
    let errors = 0
    const results = []

    for (const order of ordersWithShipments) {
      const activeShipment = order.shipments.find(s => 
        !['DELIVERED', 'CANCELLED'].includes(s.status)
      )

      if (!activeShipment) continue

      // Get provider order ID from providerOrderId field or extract from providerResponse
      let providerOrderId = activeShipment.providerOrderId
      if (!providerOrderId && activeShipment.providerResponse) {
        try {
          const response = JSON.parse(activeShipment.providerResponse)
          providerOrderId = response.response?.order?.id?.toString()
        } catch (error) {
          console.error('Failed to parse provider response for order:', order.externalId)
          continue
        }
      }

      if (!providerOrderId) {
        console.log(`Skipping order ${order.externalId} - no provider order ID`)
        continue
      }

      try {
        // Check status via API
        const apaczka = await getApaczkaAPI()
        const apaczkaStatus = await apaczka.getShipmentStatus(providerOrderId)
        
        const apaczkaOrderStatus = apaczkaStatus.status || apaczkaStatus.response?.order?.status
        const mappedStatus = mapApaczkaStatus(apaczkaOrderStatus)
        const previousStatus = order.status

        if (shouldUpdateOrderStatus(previousStatus, mappedStatus)) {
          await prisma.order.update({
            where: { id: order.id },
            data: { status: mappedStatus as any }
          })
          updated++
          
          results.push({
            orderId: order.id,
            externalId: order.externalId,
            trackingNumber: order.trackingNumber,
            previousStatus,
            newStatus: mappedStatus,
            apaczkaStatus: apaczkaStatus.status
          })
        }

        // Update shipment last checked
        await prisma.shipment.update({
          where: { id: activeShipment.id },
          data: {
            lastChecked: new Date(),
            status: apaczkaOrderStatus || activeShipment.status,
            providerResponse: JSON.stringify(apaczkaStatus)
          }
        })

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200))

      } catch (error) {
        console.error(`❌ Failed to check status for order ${order.externalId}:`, error)
        errors++
      }
    }

    return NextResponse.json({
      success: true,
      checked: ordersWithShipments.length,
      updated,
      errors,
      results
    })

  } catch (error) {
    console.error('💥 Error in bulk status check:', error)
    return NextResponse.json(
      { 
        error: 'Failed to check shipment statuses', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}