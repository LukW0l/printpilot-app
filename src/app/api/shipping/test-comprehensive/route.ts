import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export async function GET(request: NextRequest) {
  const results = {
    apaczka: {
      success: false,
      error: null as string | null,
      details: {} as any
    },
    furgonetka: {
      success: false,
      error: null as string | null,
      details: {} as any
    }
  }

  // Test Apaczka API
  try {
    console.log('\n=== TESTING APACZKA API ===')
    
    const appId = process.env.APACZKA_APP_ID || ''
    const apiKey = process.env.APACZKA_API_KEY || ''
    
    if (!appId || !apiKey) {
      throw new Error('Missing APACZKA_APP_ID or APACZKA_API_KEY')
    }

    // Test different signature formats
    const route = 'orders'
    const expires = Math.floor(Date.now() / 1000) + (10 * 60)
    
    // Try different request data formats
    const testFormats = [
      { name: 'OpenAPI format', data: JSON.stringify({ page: 1, limit: 5 }) },
      { name: 'Empty object', data: '{}' },
      { name: 'Empty array', data: '[]' },
      { name: 'Minimal object', data: JSON.stringify({ limit: 5, page: 1 }) }
    ]

    for (const format of testFormats) {
      console.log(`\nTrying format: ${format.name}`)
      console.log(`Request data: ${format.data}`)
      
      const stringToSign = `${appId}:${route}:${format.data}:${expires}`
      const signature = crypto.createHmac('sha256', apiKey).update(stringToSign).digest('hex')
      
      console.log(`String to sign: ${stringToSign}`)
      console.log(`Signature: ${signature}`)
      
      const formData = new URLSearchParams({
        app_id: appId,
        request: format.data,
        expires: expires.toString(),
        signature: signature
      })

      try {
        const response = await fetch('https://www.apaczka.pl/api/v2/orders/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          },
          body: formData
        })

        const responseText = await response.text()
        console.log(`Response status: ${response.status}`)
        console.log(`Response: ${responseText.substring(0, 200)}`)

        if (response.ok) {
          const jsonResponse = JSON.parse(responseText)
          if (jsonResponse.status === 200) {
            results.apaczka.success = true
            results.apaczka.details = {
              workingFormat: format.name,
              response: jsonResponse
            }
            break
          }
        }

        // If we get an authentication error, save it
        if (responseText.includes('Signature doesn\'t match') || responseText.includes('signature')) {
          results.apaczka.error = `Format "${format.name}" failed: ${responseText}`
        }
      } catch (err) {
        console.error(`Format ${format.name} error:`, err)
      }
    }

    if (!results.apaczka.success && !results.apaczka.error) {
      results.apaczka.error = 'All formats failed - no specific error message'
    }

  } catch (error) {
    console.error('Apaczka test error:', error)
    results.apaczka.error = error instanceof Error ? error.message : 'Unknown error'
  }

  // Test Furgonetka API
  try {
    console.log('\n=== TESTING FURGONETKA API ===')
    
    const clientId = process.env.FURGONETKA_CLIENT_ID || ''
    const clientSecret = process.env.FURGONETKA_CLIENT_SECRET || ''
    const username = process.env.FURGONETKA_USERNAME || ''
    const password = process.env.FURGONETKA_PASSWORD || ''

    if (!clientId || !clientSecret || !username || !password) {
      throw new Error('Missing Furgonetka credentials in environment variables')
    }

    // Test both sandbox and production
    const endpoints = [
      { name: 'Sandbox', url: 'https://api.sandbox.furgonetka.pl/oauth/token' },
      { name: 'Production', url: 'https://api.furgonetka.pl/oauth/token' }
    ]

    for (const endpoint of endpoints) {
      console.log(`\nTrying ${endpoint.name}: ${endpoint.url}`)
      
      const formData = new URLSearchParams({
        grant_type: 'password',
        client_id: clientId,
        client_secret: clientSecret,
        username: username,
        password: password,
        scope: 'api'
      })

      try {
        const response = await fetch(endpoint.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          },
          body: formData
        })

        const responseText = await response.text()
        console.log(`Response status: ${response.status}`)
        console.log(`Response: ${responseText.substring(0, 200)}`)

        if (response.ok) {
          const tokenData = JSON.parse(responseText)
          results.furgonetka.success = true
          results.furgonetka.details = {
            workingEndpoint: endpoint.name,
            tokenType: tokenData.token_type,
            expiresIn: tokenData.expires_in
          }
          break
        } else {
          // Parse error response
          try {
            const errorData = JSON.parse(responseText)
            results.furgonetka.error = `${endpoint.name}: ${errorData.error || 'Unknown error'} - ${errorData.error_description || ''}`
          } catch {
            results.furgonetka.error = `${endpoint.name}: ${responseText}`
          }
        }
      } catch (err) {
        console.error(`${endpoint.name} error:`, err)
      }
    }

  } catch (error) {
    console.error('Furgonetka test error:', error)
    results.furgonetka.error = error instanceof Error ? error.message : 'Unknown error'
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    results
  })
}