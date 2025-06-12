import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getApaczkaAPI } from '@/lib/apaczka'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const shipmentId = resolvedParams.id
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'pdf'

    console.log('🏷️ Getting label for shipment:', shipmentId, 'format:', format)

    // Get shipment from database
    const shipment = await prisma.shipments.findUnique({
      where: { id: shipmentId },
      include: {
        orders: {
          include: {
            shops: true
          }
        }
      }
    })

    if (!shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 })
    }

    // Check if shipment has a label URL already
    if (shipment.labelUrl) {
      console.log('📄 Using existing label URL:', shipment.labelUrl)
      return NextResponse.json({
        success: true,
        labelUrl: shipment.labelUrl,
        trackingNumber: shipment.trackingNumber,
        format: 'pdf'
      })
    }

    // If no label URL, try to generate one via API
    if (shipment.provider === 'apaczka' && shipment.providerOrderId) {
      try {
        const apaczka = await getApaczkaAPI()
        const labelResponse = await apaczka.getShipmentLabel(
          shipment.providerOrderId, 
          format as 'pdf' | 'zpl'
        )

        console.log('📋 Label response:', labelResponse)

        let labelUrl = null
        if (labelResponse.url) {
          labelUrl = labelResponse.url
        } else if (labelResponse.waybill_url) {
          labelUrl = labelResponse.waybill_url
        } else if (labelResponse.response?.waybill_url) {
          labelUrl = labelResponse.response.waybill_url
        }

        if (labelUrl) {
          // Update shipment with label URL
          await prisma.shipments.update({
            where: { id: shipmentId },
            data: { labelUrl }
          })

          return NextResponse.json({
            success: true,
            labelUrl,
            trackingNumber: shipment.trackingNumber,
            format: format
          })
        }

        // If we got raw PDF data, we could serve it directly
        if (labelResponse.data || labelResponse.content) {
          const pdfData = labelResponse.data || labelResponse.content
          
          return new NextResponse(pdfData, {
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `attachment; filename="label-${shipment.trackingNumber}.pdf"`
            }
          })
        }

        throw new Error('No label data received from API')

      } catch (apiError) {
        console.error('❌ Error getting label from API:', apiError)
        
        // Update shipment with error info
        await prisma.shipments.update({
          where: { id: shipmentId },
          data: {
            errorMessage: `Label generation failed: ${apiError instanceof Error ? apiError.message : 'Unknown error'}`,
            retryCount: shipment.retryCount + 1
          }
        })

        return NextResponse.json(
          { 
            error: 'Failed to generate label', 
            details: apiError instanceof Error ? apiError.message : 'Unknown error' 
          },
          { status: 500 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Cannot generate label for this shipment' },
      { status: 400 }
    )

  } catch (error) {
    console.error('💥 Error in label endpoint:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get shipment label', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

// Alternative route for order-based label generation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const orderId = resolvedParams.id
    const body = await request.json()
    const { format = 'pdf' } = body

    console.log('🏷️ Getting label for orders:', orderId)

    // Get order with its shipments
    const order = await prisma.orders.findUnique({
      where: { id: orderId },
      include: {
        shipments: {
          where: {
            status: {
              in: ['CONFIRMED', 'PICKED_UP', 'IN_TRANSIT']
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const activeShipment = order.shipments[0]
    if (!activeShipment) {
      return NextResponse.json({ error: 'No active shipment found for this order' }, { status: 404 })
    }

    // Use the shipment to get label directly (avoid recursive fetch)
    console.log('🔄 Found active shipment:', activeShipment.id, 'with tracking:', activeShipment.trackingNumber)
    
    // Check if shipment has a label URL already
    if (activeShipment.labelUrl) {
      console.log('📄 Using existing label URL:', activeShipment.labelUrl)
      return NextResponse.json({
        success: true,
        labelUrl: activeShipment.labelUrl,
        trackingNumber: activeShipment.trackingNumber,
        format: 'pdf'
      })
    }

    // If no label URL, try to generate one via API
    if (activeShipment.provider === 'apaczka' && activeShipment.providerOrderId) {
      console.log('🏷️ Getting label for provider order ID:', activeShipment.providerOrderId)
      try {
        const apaczka = await getApaczkaAPI()
        const labelResponse = await apaczka.getShipmentLabel(
          activeShipment.providerOrderId, 
          format as 'pdf' | 'zpl'
        )

        console.log('📋 Label response:', labelResponse)

        let labelUrl = null
        let labelData = null
        
        // Check for URL-based label first
        if (labelResponse.url) {
          labelUrl = labelResponse.url
        } else if (labelResponse.waybill_url) {
          labelUrl = labelResponse.waybill_url
        } else if (labelResponse.response?.waybill_url) {
          labelUrl = labelResponse.response.waybill_url
        }
        // Check for base64 data in response.waybill
        else if (labelResponse.response?.waybill) {
          labelData = labelResponse.response.waybill
          const fileFormat = labelResponse.response.type || format
          
          // Return the base64 data directly for PDF downloads
          return NextResponse.json({
            success: true,
            labelData,
            format: fileFormat,
            trackingNumber: activeShipment.trackingNumber,
            isBase64: true
          })
        }

        if (labelUrl) {
          // Update shipment with label URL
          await prisma.shipments.update({
            where: { id: activeShipment.id },
            data: { labelUrl }
          })

          return NextResponse.json({
            success: true,
            labelUrl,
            trackingNumber: activeShipment.trackingNumber,
            format: format
          })
        }

        throw new Error('No label data received from API')

      } catch (apiError) {
        console.error('❌ Error getting label from API:', apiError)
        
        return NextResponse.json(
          { 
            error: 'Failed to generate label', 
            details: apiError instanceof Error ? apiError.message : 'Unknown error' 
          },
          { status: 500 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Cannot generate label for this shipment' },
      { status: 400 }
    )

  } catch (error) {
    console.error('💥 Error in order label endpoint:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get order label', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}