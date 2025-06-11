import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import axios from 'axios'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shopId: string }> }
) {
  try {
    const { shopId } = await params
    console.log('Testing shop connection:', shopId)
    
    const shop = await prisma.shop.findUnique({
      where: { id: shopId }
    })

    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }

    // Test 1: Basic connection
    const testResults = {
      shop: {
        name: shop.name,
        url: shop.url,
        hasApiKey: !!shop.apiKey,
        hasApiSecret: !!shop.apiSecret
      },
      tests: {
        connection: false,
        authentication: false,
        ordersEndpoint: false,
        orderCount: 0
      },
      errors: [] as Array<{ message: string; status?: number; data?: any }>
    }

    try {
      // Test 2: Try to connect to WooCommerce API
      const apiUrl = `${shop.url}/wp-json/wc/v3/system_status`
      console.log('Testing API URL:', apiUrl)
      
      const response = await axios.get(apiUrl, {
        auth: {
          username: shop.apiKey || '',
          password: shop.apiSecret || ''
        },
        timeout: 10000
      })

      testResults.tests.connection = true
      testResults.tests.authentication = response.status === 200

      // Test 3: Try to fetch orders
      const ordersUrl = `${shop.url}/wp-json/wc/v3/orders`
      const ordersResponse = await axios.get(ordersUrl, {
        auth: {
          username: shop.apiKey || '',
          password: shop.apiSecret || ''
        },
        params: {
          per_page: 10
        }
      })

      testResults.tests.ordersEndpoint = true
      testResults.tests.orderCount = ordersResponse.data.length

    } catch (error: any) {
      console.error('Connection test error:', error.response?.data || error.message)
      testResults.errors.push({
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      })
    }

    return NextResponse.json(testResults)
  } catch (error) {
    console.error('Test error:', error)
    return NextResponse.json(
      { error: 'Test failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}