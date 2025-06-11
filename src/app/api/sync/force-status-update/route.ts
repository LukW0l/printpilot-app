import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { WooCommerceIntegration } from '@/lib/woocommerce'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting forced status update for all shops...')
    
    // Get all active shops
    const shops = await prisma.shop.findMany({
      where: {
        isActive: true,
        apiKey: { not: null },
        apiSecret: { not: null }
      }
    })

    console.log(`Found ${shops.length} active shops`)
    
    let totalUpdated = 0
    const updateDetails: any[] = []

    for (const shop of shops) {
      try {
        console.log(`\n🏪 Processing shop: ${shop.name}`)
        
        const wooCommerce = new WooCommerceIntegration({
          url: shop.url,
          consumerKey: shop.apiKey!,
          consumerSecret: shop.apiSecret!
        })

        // Fetch ALL orders from WooCommerce (not just recent ones)
        console.log('Fetching ALL orders from WooCommerce...')
        const wooOrders = await wooCommerce.fetchOrders({
          per_page: 100,
          status: 'any'
        })

        console.log(`Found ${wooOrders.length} orders in WooCommerce`)

        // Get all orders for this shop from our database
        const dbOrders = await prisma.order.findMany({
          where: { shopId: shop.id },
          select: {
            id: true,
            externalId: true,
            status: true,
            paymentStatus: true
          }
        })

        console.log(`Found ${dbOrders.length} orders in our database`)

        let shopUpdated = 0
        const shopDetails: any[] = []

        // Compare and update statuses
        for (const wooOrder of wooOrders) {
          const dbOrder = dbOrders.find(o => o.externalId === wooOrder.id.toString())
          
          if (dbOrder) {
            const newStatus = mapWooStatusToOurStatus(wooOrder.status)
            const newPaymentStatus = mapWooPaymentStatusToOurStatus(
              wooOrder.status, 
              wooOrder.payment_method_title || wooOrder.payment_method || ''
            )

            console.log(`🔍 Checking order ${wooOrder.id}:`)
            console.log(`   WooCommerce status: "${wooOrder.status}"`)
            console.log(`   Our DB status: "${dbOrder.status}" → Mapped: "${newStatus}"`)
            console.log(`   Our DB payment: "${dbOrder.paymentStatus}" → Mapped: "${newPaymentStatus}"`)
            console.log(`   Payment method: "${wooOrder.payment_method_title || wooOrder.payment_method}"`)

            if (dbOrder.status !== newStatus || dbOrder.paymentStatus !== newPaymentStatus) {
              console.log(`📝 *** UPDATING order ${wooOrder.id} ***`)
              console.log(`   Status: ${dbOrder.status} → ${newStatus}`)
              console.log(`   Payment: ${dbOrder.paymentStatus} → ${newPaymentStatus}`)

              await prisma.order.update({
                where: { id: dbOrder.id },
                data: {
                  status: newStatus,
                  paymentStatus: newPaymentStatus,
                  updatedAt: new Date()
                }
              })

              shopUpdated++
              shopDetails.push({
                externalId: wooOrder.id,
                oldStatus: dbOrder.status,
                newStatus: newStatus,
                oldPaymentStatus: dbOrder.paymentStatus,
                newPaymentStatus: newPaymentStatus,
                wooStatus: wooOrder.status
              })
            } else {
              console.log(`✅ Order ${wooOrder.id} already up to date`)
            }
          } else {
            console.log(`⚠️ Order ${wooOrder.id} found in WooCommerce but not in our DB`)
          }
        }

        totalUpdated += shopUpdated
        updateDetails.push({
          shopName: shop.name,
          updatedCount: shopUpdated,
          details: shopDetails
        })

        console.log(`✅ Shop ${shop.name}: Updated ${shopUpdated} orders`)

      } catch (error) {
        console.error(`❌ Error processing shop ${shop.name}:`, error)
        updateDetails.push({
          shopName: shop.name,
          error: error instanceof Error ? error.message : 'Unknown error',
          updatedCount: 0
        })
      }
    }

    console.log(`\n🎉 Force status update completed!`)
    console.log(`Total orders updated: ${totalUpdated}`)

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${totalUpdated} orders across ${shops.length} shops`,
      totalUpdated,
      shopsProcessed: shops.length,
      details: updateDetails
    })

  } catch (error) {
    console.error('Force status update error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

// Helper functions from woocommerce.ts
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

function mapWooPaymentStatusToOurStatus(wooStatus: string, paymentMethod: string): 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'COD' {
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