import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Pobierz dane z bazy lub env
    const { prisma } = await import('@/lib/prisma')
    const config = await prisma.system_config.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    })
    
    const appId = config?.apaczkaAppId || process.env.APACZKA_APP_ID
    const apiKey = config?.apaczkaApiKey || process.env.APACZKA_API_KEY
    
    if (!appId || !apiKey) {
      return NextResponse.json({
        success: false,
        error: 'Brak danych API'
      })
    }

    // Test z najprostszym endpointem - lista zamówień
    const crypto = require('crypto')
    const route = 'orders'
    const requestData = JSON.stringify({ page: 1, limit: 5 })  // Proper format per OpenAPI spec
    const expires = Math.floor(Date.now() / 1000) + (10 * 60)
    const stringToSign = `${appId}:${route}:${requestData}:${expires}`
    const signature = crypto.createHmac('sha256', apiKey).update(stringToSign).digest('hex')
    
    console.log('=== APACZKA API DEBUG ===')
    console.log('App ID:', appId)
    console.log('API Key length:', apiKey.length)
    console.log('API Key (first 10 chars):', apiKey.substring(0, 10))
    console.log('Route:', route)
    console.log('Request data:', requestData)
    console.log('Expires:', expires)
    console.log('String to sign:', stringToSign)
    console.log('Signature:', signature)
    
    const formData = new URLSearchParams({
      app_id: appId,
      request: requestData,
      expires: expires.toString(),
      signature: signature
    })
    
    const url = 'https://www.apaczka.pl/api/v2/orders/'
    console.log('URL:', url)
    console.log('Form data:', formData.toString())
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: formData
    })
    
    console.log('Response status:', response.status)
    console.log('Response headers:', Object.fromEntries(response.headers.entries()))
    
    const responseText = await response.text()
    console.log('Response body:', responseText)
    
    let jsonResponse
    try {
      jsonResponse = JSON.parse(responseText)
    } catch (e) {
      return NextResponse.json({
        success: false,
        error: 'Invalid JSON response',
        responseText,
        debug: {
          appId,
          apiKeyLength: apiKey.length,
          stringToSign,
          signature,
          formData: formData.toString()
        }
      })
    }
    
    return NextResponse.json({
      success: jsonResponse.status === 200,
      response: jsonResponse,
      debug: {
        appId,
        apiKeyLength: apiKey.length,
        stringToSign,
        signature
      }
    })
    
  } catch (error) {
    console.error('Debug test failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}