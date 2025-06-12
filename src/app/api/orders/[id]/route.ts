import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const refresh = searchParams.get('refresh') === 'true'
    
    const order = await prisma.orders.findUnique({
      where: { id },
      include: {
        order_items: {
          include: {
            production_costs: true
          }
        },
        shops: true,
        shipments: true
      }
    })
    
    console.log('API Debug - Order tracking info:', {
      id: order?.id,
      externalId: order?.externalId,
      trackingNumber: order?.trackingNumber,
      shippingProvider: order?.shippingProvider,
      shipmentsCount: order?.shipments?.length
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // If refresh=true, fetch latest data from WooCommerce
    if (refresh && order.shops?.platform === 'woocommerce' && order.shops?.apiKey && order.shops?.apiSecret) {
      try {
        console.log(`🔄 Refreshing order ${order.externalId} from WooCommerce...`)
        console.log(`Shop URL: ${order.shops!.url}`)
        console.log(`API Key exists: ${!!order.shops!.apiKey}`)
        console.log(`API Secret exists: ${!!order.shops!.apiSecret}`)
        
        const WooCommerceRestApi = require('@woocommerce/woocommerce-rest-api').default
        const api = new WooCommerceRestApi({
          url: order.shops!.url,
          consumerKey: order.shops!.apiKey,
          consumerSecret: order.shops!.apiSecret,
          version: 'wc/v3'
        })

        console.log(`📡 Fetching WooCommerce orders: orders/${order.externalId}`)
        const { data: wooOrder } = await api.get(`orders/${order.externalId}`)
        
        console.log('🔍 WooCommerce order data:', {
          id: wooOrder.id,
          status: wooOrder.status,
          payment_method: wooOrder.payment_method,
          payment_method_title: wooOrder.payment_method_title,
          date_paid: wooOrder.date_paid,
          total: wooOrder.total,
          shipping_total: wooOrder.shipping_total,
          billing_phone: wooOrder.billing?.phone,
          customer_note: wooOrder.customer_note
        })
        
        // Update order with fresh WooCommerce data, but PRESERVE local shipping data
        const updatedOrder = await prisma.orders.update({
          where: { id },
          data: {
            paymentStatus: mapPaymentStatus(wooOrder.status, wooOrder.payment_method_title),
            paymentMethod: wooOrder.payment_method_title || null,
            paidAt: wooOrder.date_paid ? new Date(wooOrder.date_paid) : null,
            shippingCost: parseFloat(wooOrder.shipping_total || '0'),
            totalAmount: parseFloat(wooOrder.total || '0'),
            customerPhone: wooOrder.billing?.phone || order.customerPhone,
            // Customer delivery notes from WooCommerce
            deliveryNotes: wooOrder.customer_note || order.deliveryNotes,
            // PRESERVE existing shipping data - don't overwrite from WooCommerce
            trackingNumber: order.trackingNumber,
            shippingProvider: order.shippingProvider,
            // Update shipping address if needed
            shippingAddress: JSON.stringify({
              firstName: wooOrder.shipping?.first_name || wooOrder.billing?.first_name,
              lastName: wooOrder.shipping?.last_name || wooOrder.billing?.last_name,
              company: wooOrder.shipping?.company || '',
              address1: wooOrder.shipping?.address_1 || wooOrder.billing?.address_1,
              address2: wooOrder.shipping?.address_2 || wooOrder.billing?.address_2,
              city: wooOrder.shipping?.city || wooOrder.billing?.city,
              state: wooOrder.shipping?.state || wooOrder.billing?.state,
              postcode: wooOrder.shipping?.postcode || wooOrder.billing?.postcode,
              country: wooOrder.shipping?.country || wooOrder.billing?.country
            }),
            // Update billing address
            billingAddress: JSON.stringify({
              firstName: wooOrder.billing?.first_name,
              lastName: wooOrder.billing?.last_name,
              company: wooOrder.billing?.company || '',
              address1: wooOrder.billing?.address_1,
              address2: wooOrder.billing?.address_2,
              city: wooOrder.billing?.city,
              state: wooOrder.billing?.state,
              postcode: wooOrder.billing?.postcode,
              country: wooOrder.billing?.country,
              email: wooOrder.billing?.email,
              phone: wooOrder.billing?.phone
            })
          },
          include: {
            order_items: {
              include: {
                production_costs: true
              }
            },
            shops: true
          }
        })

        console.log(`✅ Refreshed order ${order.externalId} from WooCommerce`)
        console.log('💾 Updated order data:', {
          paymentStatus: updatedOrder.paymentStatus,
          paymentMethod: updatedOrder.paymentMethod,
          paidAt: updatedOrder.paidAt,
          shippingCost: updatedOrder.shippingCost,
          totalAmount: updatedOrder.totalAmount,
          customerPhone: updatedOrder.customerPhone
        })
        return NextResponse.json(updatedOrder)
        
      } catch (wooError) {
        console.error('❌ Failed to refresh from WooCommerce:', wooError)
        console.error('Error details:', {
          message: wooError instanceof Error ? wooError.message : 'Unknown error',
          response: (wooError as any)?.response?.data,
          status: (wooError as any)?.response?.status
        })
        // Return cached data if WooCommerce refresh fails
        return NextResponse.json(order)
      }
    } else {
      console.log('⚠️ Refresh skipped:', {
        refresh,
        platform: order.shops?.platform,
        hasApiKey: !!order.shops?.apiKey,
        hasApiSecret: !!order.shops?.apiSecret
      })
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    )
  }
}

// Helper function to map WooCommerce status to our payment status
function mapPaymentStatus(orderStatus: string, paymentMethod?: string): 'PENDING' | 'PAID' | 'COD' | 'FAILED' | 'REFUNDED' | 'CANCELLED' {
  switch (orderStatus) {
    case 'completed':
    case 'processing':
      return 'PAID'
    case 'on-hold':
      return paymentMethod?.toLowerCase().includes('cod') || paymentMethod?.toLowerCase().includes('pobranie') ? 'COD' : 'PENDING'
    case 'pending':
      return 'PENDING'
    case 'cancelled':
    case 'refunded':
      return 'CANCELLED'
    case 'failed':
      return 'FAILED'
    default:
      return 'PENDING'
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    // Clean up tracking number if present
    if (body.trackingNumber && typeof body.trackingNumber === 'string') {
      body.trackingNumber = body.trackingNumber.trim()
    }
    
    const order = await prisma.orders.update({
      where: { id },
      data: body,
      include: {
        order_items: {
          include: {
            production_costs: true
          }
        },
        shops: true
      }
    })

    return NextResponse.json(order)
  } catch (error) {
    console.error('Error updating orders:', error)
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    )
  }
}