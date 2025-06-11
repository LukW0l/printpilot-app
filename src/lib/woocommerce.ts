import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api'
import { prisma } from './prisma'
import { calculateProductionCost, saveProductionCostForOrder } from './production-cost-calculator'

export interface WooCommerceConfig {
  url: string
  consumerKey: string
  consumerSecret: string
}

export class WooCommerceIntegration {
  private api: WooCommerceRestApi

  constructor(config: WooCommerceConfig) {
    this.api = new WooCommerceRestApi({
      url: config.url,
      consumerKey: config.consumerKey,
      consumerSecret: config.consumerSecret,
      version: 'wc/v3'
    })
  }

  async fetchOrders(params?: {
    status?: string
    per_page?: number
    page?: number
    after?: string
  }) {
    try {
      console.log('Fetching orders with params:', params)
      const response = await this.api.get('orders', params || {})
      console.log('WooCommerce response status:', response.status)
      console.log('Number of orders fetched:', response.data?.length || 0)
      return response.data
    } catch (error: any) {
      console.error('WooCommerce API Error:', error.response?.data || error.message)
      throw error
    }
  }

  async syncOrdersToDatabase(shopId: string, orders: any[]) {
    console.log(`Starting syncOrdersToDatabase for shop ${shopId} with ${orders.length} orders`)
    const syncedOrders = []

    for (const wooOrder of orders) {
      try {
        console.log(`Processing order ${wooOrder.id}:`, {
          status: wooOrder.status,
          date_created: wooOrder.date_created,
          total: wooOrder.total,
          items: wooOrder.line_items?.length || 0
        })

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
          status: this.mapWooStatusToOurStatus(wooOrder.status),
          paymentStatus: this.mapWooPaymentStatusToOurStatus(wooOrder.status, wooOrder.payment_method_title || wooOrder.payment_method || ''),
          paymentMethod: wooOrder.payment_method_title || wooOrder.payment_method || null,
          paidAt: wooOrder.date_paid ? new Date(wooOrder.date_paid) : null,
          totalAmount: parseFloat(wooOrder.total),
          shippingCost: parseFloat(wooOrder.shipping_total || 0),
          currency: wooOrder.currency,
          orderDate: new Date(wooOrder.date_created),
          deliveryNotes: wooOrder.customer_note || null,
          items: wooOrder.line_items.map((item: any) => ({
            name: item.name,
            sku: item.sku || null,
            quantity: item.quantity,
            price: parseFloat(item.price),
            imageUrl: item.image?.src || null,
            productType: this.extractProductType(item)
          }))
        }

        console.log('Checking for existing order:', orderData.externalId)
        const existingOrder = await prisma.order.findUnique({
          where: {
            externalId_shopId: {
              externalId: orderData.externalId,
              shopId: shopId
            }
          }
        })
        console.log('Existing order found:', !!existingOrder)

        if (existingOrder) {
          console.log(`🔄 UPDATING ORDER ${existingOrder.externalId}:`)
          console.log(`   Old status: ${existingOrder.status} → New status: ${orderData.status}`)
          console.log(`   Old payment: ${existingOrder.paymentStatus} → New payment: ${orderData.paymentStatus}`)
          console.log(`   WooCommerce status: "${wooOrder.status}"`)
          
          const updatedOrder = await prisma.order.update({
            where: { id: existingOrder.id },
            data: {
              status: orderData.status,
              paymentStatus: orderData.paymentStatus,
              paymentMethod: orderData.paymentMethod,
              paidAt: orderData.paidAt,
              totalAmount: orderData.totalAmount,
              shippingCost: orderData.shippingCost,
              deliveryNotes: orderData.deliveryNotes,
              updatedAt: new Date()
            },
            include: {
              items: true,
              shop: true
            }
          })
          console.log(`✅ Updated order ${updatedOrder.externalId} successfully`)
          syncedOrders.push(updatedOrder)
        } else {
          console.log('Creating new order...')
          const newOrder = await prisma.order.create({
            data: {
              ...orderData,
              items: {
                create: orderData.items
              }
            },
            include: {
              items: true,
              shop: true
            }
          })
          console.log('Created new order:', newOrder.id)
          syncedOrders.push(newOrder)
          
          // Calculate production costs for each item
          for (const item of newOrder.items) {
            try {
              await this.calculateProductionCostForItem(item)
            } catch (error) {
              console.error(`Failed to calculate production cost for item ${item.id}:`, error)
            }
          }
        }
      } catch (error) {
        console.error(`Error syncing order ${wooOrder.id}:`, error)
        console.error('Order data that failed:', JSON.stringify(wooOrder, null, 2))
      }
    }

    console.log(`Finished syncing. Total synced: ${syncedOrders.length}`)
    return syncedOrders
  }

  private mapWooStatusToOurStatus(wooStatus: string): 'NEW' | 'PROCESSING' | 'PRINTED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' {
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

  private mapWooPaymentStatusToOurStatus(wooStatus: string, paymentMethod: string): 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'COD' {
    // Special handling for COD (Cash on Delivery) payments
    if (paymentMethod && paymentMethod.toLowerCase().includes('pobraniem')) {
      return 'COD'
    }
    
    const paymentStatusMap: Record<string, 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'> = {
      'pending': 'PENDING',
      'processing': 'PAID',
      'on-hold': 'PENDING',
      'completed': 'PAID',
      'cancelled': 'FAILED',
      'refunded': 'REFUNDED',
      'failed': 'FAILED'
    }
    return paymentStatusMap[wooStatus] || 'PENDING'
  }

  private extractProductType(item: any): string {
    const name = item.name.toLowerCase()
    if (name.includes('obraz')) return 'canvas'  // Obrazy to zazwyczaj canvas
    if (name.includes('canvas')) return 'canvas'
    if (name.includes('poster')) return 'poster'
    if (name.includes('plakat')) return 'poster'  // Polski odpowiednik
    if (name.includes('print')) return 'print'
    if (name.includes('druk')) return 'print'     // Polski odpowiednik
    if (name.includes('wall')) return 'wall-art'
    if (name.includes('grafika')) return 'print'  // Grafika to print
    return 'other'
  }

  private async calculateProductionCostForItem(item: any): Promise<void> {
    try {
      console.log(`Calculating production cost for item: ${item.name}`)
      
      // Parse dimensions from item name
      const dimensionMatch = item.name.match(/(\d+)x(\d+)/)
      if (!dimensionMatch) {
        console.log(`Could not parse dimensions from: ${item.name}`)
        return
      }

      const dimensionString = `${dimensionMatch[1]}x${dimensionMatch[2]}`
      console.log(`Parsed dimensions: ${dimensionString}`)

      // Calculate production cost
      const costResult = await calculateProductionCost(dimensionString)
      if (!costResult) {
        console.log('Failed to calculate production cost')
        return
      }

      // Save production cost to database
      await saveProductionCostForOrder(item.id, costResult)
      console.log(`Production cost calculated and saved for item ${item.id}`)
      
    } catch (error) {
      console.error(`Error calculating production cost for item ${item.id}:`, error)
    }
  }
}

export async function syncShopOrders(shopId: string) {
  const startTime = Date.now()
  
  // Create sync log entry
  const syncLog = await prisma.syncLog.create({
    data: {
      shopId,
      status: 'RUNNING',
      startedAt: new Date()
    }
  })

  try {
    console.log('Fetching shop data for ID:', shopId)
    const shop = await prisma.shop.findUnique({
      where: { id: shopId }
    })

    if (!shop || !shop.apiKey || !shop.apiSecret) {
      throw new Error('Shop not found or missing API credentials')
    }

    console.log('Shop found:', shop.name, shop.url)

    const wooCommerce = new WooCommerceIntegration({
      url: shop.url,
      consumerKey: shop.apiKey,
      consumerSecret: shop.apiSecret
    })

    console.log('Fetching orders from WooCommerce...')
    const orders = await wooCommerce.fetchOrders({
      per_page: 100,
      status: 'any'
    })

    console.log(`Fetched ${orders.length} orders from WooCommerce`)

    // Update sync log with API order count
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        apiOrderCount: orders.length
      }
    })

    if (orders.length === 0) {
      console.log('No orders found in WooCommerce')
      
      // Update sync log as success with no orders
      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: 'SUCCESS',
          finishedAt: new Date(),
          duration: Date.now() - startTime,
          totalOrders: 0,
          newOrders: 0,
          updatedOrders: 0,
          failedOrders: 0
        }
      })
      
      return []
    }

    const syncResult = await wooCommerce.syncOrdersToDatabase(shopId, orders)
    const endTime = Date.now()
    
    // Calculate sync statistics
    const newOrders = syncResult.filter((order: any) => order.createdAt >= new Date(startTime)).length
    const updatedOrders = syncResult.length - newOrders
    const failedOrders = orders.length - syncResult.length

    // Update sync log with final results
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: failedOrders > 0 ? 'PARTIAL_SUCCESS' : 'SUCCESS',
        finishedAt: new Date(endTime),
        duration: endTime - startTime,
        totalOrders: syncResult.length,
        newOrders,
        updatedOrders,
        failedOrders
      }
    })
    
    console.log(`Successfully synced ${syncResult.length} orders from shop ${shop.name}`)
    console.log(`Sync stats: ${newOrders} new, ${updatedOrders} updated, ${failedOrders} failed`)
    
    return syncResult
  } catch (error) {
    const endTime = Date.now()
    console.error('Error syncing shop orders:', error)
    
    // Update sync log with error
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: 'ERROR',
        finishedAt: new Date(endTime),
        duration: endTime - startTime,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorDetails: JSON.stringify({
          error: error instanceof Error ? error.stack : error,
          timestamp: new Date().toISOString()
        })
      }
    })
    
    throw error
  }
}