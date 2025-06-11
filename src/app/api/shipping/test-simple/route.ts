import { NextRequest, NextResponse } from 'next/server'
import { getApaczkaAPI } from '@/lib/apaczka'

export async function GET(request: NextRequest) {
  try {
    console.log('🚀 Testing Apaczka.pl API connection...')
    
    // Try to get Apaczka API instance (this will check both database and env vars)
    const apaczka = await getApaczkaAPI()
    
    console.log('✅ Apaczka API instance created successfully')
    console.log('🔍 Testing basic orders endpoint...')
    
    // Test basic API connection with orders endpoint
    const response = await apaczka.makeRequest('orders', { page: 1, limit: 5 })
    
    console.log('✅ API connection successful!')
    
    return NextResponse.json({
      success: true,
      message: 'Apaczka API connection successful',
      response: response,
      source: 'database_or_env'
    })
  } catch (error) {
    console.error('❌ Apaczka.pl API test failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}