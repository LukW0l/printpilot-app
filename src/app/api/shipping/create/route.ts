import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createShipmentFromOrder, getApaczkaAPI, calculateParcelDimensions } from '@/lib/apaczka'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId, serviceId, customDimensions } = body

    console.log('🚀 Creating shipment for order:', orderId, 'with service:', serviceId)

    // Get order from database
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, shipments: true }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Check if order already has an active shipment
    const activeShipment = order.shipments.find(s => 
      !['CANCELLED', 'ERROR', 'DELIVERED'].includes(s.status)
    )

    if (activeShipment) {
      return NextResponse.json({ 
        error: 'Order already has an active shipment',
        trackingNumber: activeShipment.trackingNumber
      }, { status: 400 })
    }

    console.log('📦 Order found:', order.externalId, 'with', order.items.length, 'items')

    // Parse addresses
    const shippingAddress = typeof order.shippingAddress === 'string' 
      ? JSON.parse(order.shippingAddress) 
      : order.shippingAddress

    // Calculate parcel dimensions - use custom if provided, otherwise calculate automatically
    let parcelDimensions
    if (customDimensions && customDimensions.width > 0) {
      console.log('📐 Using custom dimensions:', customDimensions)
      parcelDimensions = {
        width: customDimensions.width,
        height: customDimensions.height,
        depth: customDimensions.depth,
        weight: customDimensions.weight,
        insuranceValue: order.items.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0)
      }
    } else {
      console.log('📐 Calculating automatic dimensions')
      parcelDimensions = calculateParcelDimensions(order.items)
    }

    // Create shipment record in database first
    const shipmentRecord = await prisma.shipment.create({
      data: {
        orderId: order.id,
        provider: 'apaczka',
        serviceId: serviceId || 'auto',
        serviceName: 'Pending service selection',
        trackingNumber: 'PENDING',
        recipientName: `${shippingAddress.firstName} ${shippingAddress.lastName}`,
        recipientAddress: JSON.stringify(shippingAddress),
        weight: parcelDimensions.weight,
        dimensions: JSON.stringify(parcelDimensions),
        insuranceValue: parcelDimensions.insuranceValue,
        shippingCost: 0, // Will be updated after API call
        status: 'PENDING'
      }
    })

    console.log('📋 Shipment record created:', shipmentRecord.id)

    try {
      // Create shipment via Apaczka API
      const apaczkaResponse = await createShipmentFromOrder(order, serviceId)
      
      console.log('✅ Apaczka shipment created:', apaczkaResponse)

      // Extract tracking number and other details from nested response
      const trackingNumber = (apaczkaResponse.response?.order?.waybill_number || 
                            apaczkaResponse.tracking_number || 
                            apaczkaResponse.number || 'UNKNOWN').toString().trim()
      const shippingCost = apaczkaResponse.price?.gross || 0

      // Update shipment record with API response
      const updatedShipment = await prisma.shipment.update({
        where: { id: shipmentRecord.id },
        data: {
          trackingNumber,
          serviceName: apaczkaResponse.response?.order?.service_name || 'Apaczka Service',
          shippingCost,
          status: 'CONFIRMED',
          providerOrderId: apaczkaResponse.response?.order?.id?.toString(),
          providerResponse: JSON.stringify(apaczkaResponse),
          labelUrl: apaczkaResponse.response?.order?.waybill_url || apaczkaResponse.waybill_url,
          estimatedDelivery: apaczkaResponse.response?.order?.estimated_delivery ? 
            new Date(apaczkaResponse.response.order.estimated_delivery) : null
        }
      })

      // Update order with tracking info and set status to PACKAGED (ready for shipment)
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          trackingNumber,
          shippingProvider: 'Apaczka.pl',
          status: 'PRINTED' // Mark as printed/ready for shipment, not yet physically shipped
        }
      })

      console.log('📬 Order updated with tracking number:', trackingNumber)

      return NextResponse.json({
        success: true,
        shipment: updatedShipment,
        order: updatedOrder,
        trackingNumber,
        labelUrl: apaczkaResponse.waybill_url,
        apaczkaResponse
      })

    } catch (apiError) {
      console.error('❌ Apaczka API error:', apiError)

      // Update shipment record with error
      await prisma.shipment.update({
        where: { id: shipmentRecord.id },
        data: {
          status: 'ERROR',
          errorMessage: apiError instanceof Error ? apiError.message : 'Unknown API error',
          errorDetails: JSON.stringify(apiError),
          retryCount: 1
        }
      })

      throw apiError
    }

  } catch (error) {
    console.error('💥 Error creating shipment:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create shipment', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}