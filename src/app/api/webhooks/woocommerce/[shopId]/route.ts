import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { randomBytes } from 'crypto'

function generateId() {
  return randomBytes(12).toString('base64url')
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ shopId: string }> }
) {
  try {
    const { shopId } = await params
    const shop = await prisma.shops.findUnique({
      where: { id: shopId }
    })

    if (!shop) {
      return NextResponse.json(
        { error: 'Shop not found' },
        { status: 404 }
      )
    }

    // Verify webhook signature
    const signature = request.headers.get('x-wc-webhook-signature')
    const body = await request.text()
    
    if (signature && shop.apiSecret) {
      const expectedSignature = crypto
        .createHmac('sha256', shop.apiSecret)
        .update(body, 'utf8')
        .digest('base64')

      if (signature !== expectedSignature) {
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        )
      }
    }

    const webhookData = JSON.parse(body)
    const webhookTopic = request.headers.get('x-wc-webhook-topic')

    // Handle different webhook topics
    switch (webhookTopic) {
      case 'order.created':
      case 'order.updated':
        await handleOrderWebhook(shop.id, webhookData)
        break
      case 'order.deleted':
        await handleOrderDeleted(shop.id, webhookData.id.toString())
        break
      default:
        console.log(`Unhandled webhook topic: ${webhookTopic}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function handleOrderWebhook(shopId: string, wooOrder: any) {
  const orderData = {
    externalId: wooOrder.id.toString(),
    shopId,
    customerName: `${wooOrder.billing.first_name} ${wooOrder.billing.last_name}`,
    customerEmail: wooOrder.billing.email,
    customerPhone: wooOrder.billing.phone || null,
    shippingAddress: JSON.stringify({
      firstName: wooOrder.shipping.first_name,
      lastName: wooOrder.shipping.last_name,
      address1: wooOrder.shipping.address_1,
      address2: wooOrder.shipping.address_2,
      city: wooOrder.shipping.city,
      state: wooOrder.shipping.state,
      postcode: wooOrder.shipping.postcode,
      country: wooOrder.shipping.country
    }),
    billingAddress: JSON.stringify({
      firstName: wooOrder.billing.first_name,
      lastName: wooOrder.billing.last_name,
      address1: wooOrder.billing.address_1,
      address2: wooOrder.billing.address_2,
      city: wooOrder.billing.city,
      state: wooOrder.billing.state,
      postcode: wooOrder.billing.postcode,
      country: wooOrder.billing.country
    }),
    status: mapWooStatusToOurStatus(wooOrder.status),
    totalAmount: parseFloat(wooOrder.total),
    currency: wooOrder.currency,
    orderDate: new Date(wooOrder.date_created)
  }

  const existingOrder = await prisma.orders.findUnique({
    where: {
      externalId_shopId: {
        externalId: orderData.externalId,
        shopId: shopId
      }
    }
  })

  if (existingOrder) {
    // Update existing order
    await prisma.orders.update({
      where: { id: existingOrder.id },
      data: {
        ...orderData,
        updatedAt: new Date()
      }
    })
  } else {
    // Create new order with items
    const items = wooOrder.line_items.map((item: any) => ({
      name: item.name,
      sku: item.sku || null,
      quantity: item.quantity,
      price: parseFloat(item.price),
      imageUrl: item.image?.src || null,
      productType: extractProductType(item)
    }))

    await prisma.orders.create({
      data: {
        id: generateId(),
        ...orderData,
        order_items: {
          create: items
        },
        updatedAt: new Date()
      }
    })
  }
}

async function handleOrderDeleted(shopId: string, externalId: string) {
  const order = await prisma.orders.findUnique({
    where: {
      externalId_shopId: {
        externalId,
        shopId
      }
    }
  })

  if (order) {
    await prisma.orders.update({
      where: { id: order.id },
      data: { status: 'CANCELLED' }
    })
  }
}

function mapWooStatusToOurStatus(wooStatus: string): 'NEW' | 'PROCESSING' | 'PRINTED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' {
  const statusMap: Record<string, 'NEW' | 'PROCESSING' | 'PRINTED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'> = {
    'pending': 'NEW',
    'processing': 'PROCESSING',
    'on-hold': 'NEW',
    'completed': 'DELIVERED',
    'cancelled': 'CANCELLED',
    'refunded': 'CANCELLED',
    'failed': 'CANCELLED'
  }
  return statusMap[wooStatus] || 'NEW'
}

function extractProductType(item: any): string {
  const name = item.name.toLowerCase()
  if (name.includes('canvas')) return 'canvas'
  if (name.includes('poster')) return 'poster'
  if (name.includes('print')) return 'print'
  if (name.includes('wall')) return 'wall-art'
  return 'other'
}