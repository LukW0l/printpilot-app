interface FurgonetkaConfig {
  clientId: string
  clientSecret: string
  username: string
  password: string
  testMode?: boolean
}

interface FurgonetkaAddress {
  firstName?: string
  lastName?: string
  companyName?: string
  street: string
  buildingNumber?: string
  apartmentNumber?: string
  postalCode: string
  city: string
  countryCode: string
  email?: string
  phone?: string
}

interface FurgonetkaParcel {
  weight: number
  width: number
  height: number
  depth: number
  insuranceValue?: number
}

interface FurgonetkaShipment {
  receiver: FurgonetkaAddress
  sender?: FurgonetkaAddress
  parcels: FurgonetkaParcel[]
  serviceId: string
  additionalServices?: string[]
  comment?: string
  reference?: string
}

interface FurgonetkaService {
  id: string
  name: string
  price: {
    net: number
    gross: number
    currency: string
  }
  deliveryTime: string
  supplier: string
}

interface OAuthToken {
  access_token: string
  refresh_token: string
  expires_in: number
  expires_at: number
  token_type: string
}

export class FurgonetkaAPI {
  private config: FurgonetkaConfig
  private baseUrl: string
  private token: OAuthToken | null = null

  constructor(config: FurgonetkaConfig) {
    this.config = config
    // Note: Furgonetka uses different URLs for sandbox vs production
    this.baseUrl = config.testMode 
      ? 'https://api.sandbox.furgonetka.pl'
      : 'https://api.furgonetka.pl'
    console.log(`[FURGONETKA] Using ${config.testMode ? 'SANDBOX' : 'PRODUCTION'} mode`)
    console.log(`[FURGONETKA] Base URL: ${this.baseUrl}`)
  }

  private async getAccessToken(): Promise<string> {
    // Check if we have a valid token
    if (this.token && this.token.expires_at > Date.now()) {
      return this.token.access_token
    }

    // Try to refresh token if we have one
    if (this.token?.refresh_token) {
      try {
        await this.refreshToken()
        return this.token.access_token
      } catch (error) {
        console.warn('Token refresh failed, getting new token:', error)
      }
    }

    // Get new token using client credentials flow
    const tokenUrl = `${this.baseUrl}/oauth/token`
    
    const formData = new URLSearchParams({
      grant_type: 'password',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      username: this.config.username,
      password: this.config.password,
      scope: 'api'
    })

    console.log(`[FURGONETKA OAuth] Getting token from: ${tokenUrl}`)
    console.log(`[FURGONETKA OAuth] Client ID: ${this.config.clientId}`)
    console.log(`[FURGONETKA OAuth] Username: ${this.config.username}`)
    console.log(`[FURGONETKA OAuth] Grant type: password`)
    console.log(`[FURGONETKA OAuth] Test mode: ${this.config.testMode}`)
    console.log(`[FURGONETKA OAuth] Form data:`, {
      grant_type: 'password',
      client_id: this.config.clientId,
      username: this.config.username,
      scope: 'api'
    })

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: formData
    })

    console.log(`OAuth response status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`OAuth error response: ${errorText}`)
      throw new Error(`Furgonetka OAuth Error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const tokenData = await response.json()
    console.log('OAuth token received successfully')

    this.token = {
      ...tokenData,
      expires_at: Date.now() + (tokenData.expires_in * 1000)
    }

    return this.token?.access_token || ''
  }

  private async refreshToken(): Promise<void> {
    if (!this.token?.refresh_token) {
      throw new Error('No refresh token available')
    }

    const tokenUrl = `${this.baseUrl}/oauth/token`
    
    const formData = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      refresh_token: this.token.refresh_token
    })

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: formData
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Token refresh failed: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const tokenData = await response.json()
    this.token = {
      ...tokenData,
      expires_at: Date.now() + (tokenData.expires_in * 1000)
    }
  }

  async makeRequest(endpoint: string, data: any = {}, method: 'GET' | 'POST' = 'POST') {
    const accessToken = await this.getAccessToken()
    // Try different URL structures
    let url = `${this.baseUrl}/${endpoint}`
    
    // Special handling for calculate endpoint - may need different URL structure
    if (endpoint.includes('calculate') || endpoint.includes('price')) {
      // Try with /api/ prefix for calculation endpoints
      url = `${this.baseUrl}/api/${endpoint}`
    }
    
    console.log(`Making request to: ${url}`)
    console.log(`Method: ${method}`)
    console.log(`Request data:`, JSON.stringify(data, null, 2))

    const requestOptions: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.furgonetka.v1+json',
        'X-Language': 'pl_PL'
      }
    }

    if (method === 'POST' && Object.keys(data).length > 0) {
      if (requestOptions.headers) {
        (requestOptions.headers as any)['Content-Type'] = 'application/vnd.furgonetka.v1+json'
      }
      requestOptions.body = JSON.stringify(data)
    }

    const response = await fetch(url, requestOptions)

    console.log(`Response status: ${response.status}`)
    console.log(`Response headers:`, Object.fromEntries(response.headers.entries()))

    const responseText = await response.text()
    console.log(`Response body (first 500 chars):`, responseText.substring(0, 500))

    if (!response.ok) {
      throw new Error(`Furgonetka API Error: ${response.status} ${response.statusText} - ${responseText}`)
    }

    try {
      return JSON.parse(responseText)
    } catch (e) {
      throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}`)
    }
  }

  async getAccountInfo(): Promise<any> {
    // Test simple account endpoints from the documentation
    const response = await this.makeRequest('account/companies', {}, 'GET')
    return response || {}
  }

  async getCarriers(): Promise<any[]> {
    // Fallback to account info since carriers endpoint doesn't exist
    const accountInfo = await this.getAccountInfo()
    return accountInfo.companies || []
  }

  async getServices(fromPostalCode: string, toPostalCode: string, parcel: FurgonetkaParcel): Promise<FurgonetkaService[]> {
    // Use proper Furgonetka API structure based on documentation
    const requestData = {
      package: {
        from: {
          postal_code: fromPostalCode,
          country_code: 'PL'
        },
        to: {
          postal_code: toPostalCode,
          country_code: 'PL'
        },
        parcels: [{
          weight: parcel.weight,
          dimensions: {
            length: parcel.width,
            width: parcel.depth,
            height: parcel.height
          },
          value: parcel.insuranceValue || 0
        }]
      },
      services: {
        // Request all available carriers
        carrier_type: "all"
      }
    }

    console.log('🔍 Furgonetka getServices request (proper structure):', JSON.stringify(requestData, null, 2))
    
    // Try different calculate endpoint variations
    const calculateEndpoints = [
      'calculate',
      'price/calculate', 
      'shipping/price',
      'v1/calculate'
    ]
    
    for (const endpoint of calculateEndpoints) {
      try {
        console.log(`📦 Trying Furgonetka calculate endpoint: ${endpoint}`)
        const response = await this.makeRequest(endpoint, requestData, 'POST')
        
        console.log(`✅ Furgonetka ${endpoint} response:`, JSON.stringify(response, null, 2))
        
        const services = response.services_prices || response.data || response.services || []
        
        if (services.length > 0) {
          return services.map((service: any) => ({
            id: service.id || service.service_id || service.carrier_id || '',
            name: service.name || service.service_name || service.carrier_name || 'Standardowa',
            price: {
              net: service.price?.net || parseFloat(service.price_net || service.net || '0'),
              gross: service.price?.gross || parseFloat(service.price_gross || service.gross || service.price || '0'),
              currency: service.price?.currency || service.currency || 'PLN'
            },
            deliveryTime: service.deliveryTime || service.delivery_time || service.estimated_delivery || '1-3 dni robocze',
            supplier: service.supplier || service.carrier || service.carrier_name || 'Furgonetka'
          }))
        }
      } catch (error: any) {
        console.log(`❌ Furgonetka ${endpoint} failed:`, error.message)
        continue
      }
    }
    
    // If calculate didn't work, try the old structure as fallback
    const oldRequestData = {
      from: {
        postal_code: fromPostalCode,
        country_code: 'PL'
      },
      to: {
        postal_code: toPostalCode,
        country_code: 'PL'
      },
      parcels: [{
        weight: parcel.weight,
        dimensions: {
          length: parcel.width,
          width: parcel.depth,
          height: parcel.height
        },
        value: parcel.insuranceValue || 0
      }]
    }
    
    const fallbackEndpoints = ['shipping/calculate', 'shipping/services']
    
    for (const endpoint of fallbackEndpoints) {
      try {
        console.log(`📦 Trying Furgonetka fallback endpoint: ${endpoint}`)
        const response = await this.makeRequest(endpoint, oldRequestData, 'POST')
        
        const services = response.services_prices || response.data || response.services || []
        if (services.length > 0) {
          return services.map((service: any) => ({
            id: service.id || service.service_id || '',
            name: service.name || service.service_name || 'Standardowa',
            price: {
              net: service.price?.net || parseFloat(service.price_net || '0'),
              gross: service.price?.gross || parseFloat(service.price_gross || service.price || '0'),
              currency: service.price?.currency || service.currency || 'PLN'
            },
            deliveryTime: service.deliveryTime || service.delivery_time || '1-3 dni robocze',
            supplier: service.supplier || service.carrier || 'Furgonetka'
          }))
        }
      } catch (error: any) {
        console.log(`❌ Furgonetka ${endpoint} failed:`, error.message)
        continue
      }
    }
    
    console.log('⚠️ No Furgonetka endpoint worked, returning empty array')
    return []
  }

  async getPoints(postalCode: string, carrierId?: string) {
    const requestData: any = { postal_code: postalCode }
    if (carrierId) requestData.carrier_id = carrierId
    
    const response = await this.makeRequest('points', requestData)
    return response.data || response.points || []
  }

  async createShipment(shipment: FurgonetkaShipment) {
    const requestData = {
      sender: shipment.sender || {
        firstName: 'PrintPilot',
        lastName: 'System',
        street: 'Default Street',
        buildingNumber: '1',
        postalCode: '00-001',
        city: 'Warsaw',
        countryCode: 'PL'
      },
      receiver: shipment.receiver,
      parcels: shipment.parcels.map(parcel => ({
        weight: parcel.weight,
        dimensions: {
          length: parcel.width,
          width: parcel.depth,
          height: parcel.height
        },
        value: parcel.insuranceValue || 0
      })),
      service_id: shipment.serviceId,
      additional_services: shipment.additionalServices || [],
      comment: shipment.comment,
      reference: shipment.reference
    }

    const response = await this.makeRequest('shipping/create', requestData)
    return response
  }

  async getShipmentLabel(shipmentId: string, format: 'pdf' | 'zpl' = 'pdf') {
    const requestData = { shipment_id: shipmentId, format }
    const response = await this.makeRequest('shipping/label', requestData)
    return response
  }

  async trackShipment(trackingNumber: string) {
    const requestData = { tracking_number: trackingNumber }
    const response = await this.makeRequest('shipping/track', requestData)
    return response
  }

  // Helper method to calculate cheapest shipping option
  async getCheapestShipping(fromPostalCode: string, toPostalCode: string, parcel: FurgonetkaParcel) {
    const services = await this.getServices(fromPostalCode, toPostalCode, parcel)
    
    if (services.length === 0) return null
    
    return services.reduce((cheapest, current) => 
      current.price.gross < cheapest.price.gross ? current : cheapest
    )
  }
}

// Get Furgonetka API instance with database configuration
export async function getFurgonetkaAPI(): Promise<FurgonetkaAPI> {
  // Try to get settings from database first
  try {
    const { prisma } = await import('@/lib/prisma')
    const config = await prisma.systemConfig.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    })
    
    if (config?.furgonetkaClientId && config?.furgonetkaClientSecret && 
        config?.furgonetkaUsername && config?.furgonetkaPassword) {
      // Decode password if it looks like base64
      let password = config.furgonetkaPassword
      try {
        if (password.match(/^[A-Za-z0-9+/]+=*$/)) {
          password = Buffer.from(password, 'base64').toString('utf-8')
        }
      } catch (e) {
        // If decoding fails, use original password
      }
      
      return new FurgonetkaAPI({
        clientId: config.furgonetkaClientId,
        clientSecret: config.furgonetkaClientSecret,
        username: config.furgonetkaUsername,
        password: password,
        testMode: config.furgonetkaTestMode || false
      })
    }
  } catch (error) {
    console.warn('Could not load Furgonetka settings from database:', error)
  }
  
  // Fallback to environment variables
  const clientId = process.env.FURGONETKA_CLIENT_ID
  const clientSecret = process.env.FURGONETKA_CLIENT_SECRET
  const username = process.env.FURGONETKA_USERNAME
  const password = process.env.FURGONETKA_PASSWORD
  
  if (!clientId || !clientSecret || !username || !password) {
    throw new Error('Furgonetka API credentials not found in database or environment variables. Please configure them in Settings > Shipping.')
  }
  
  return new FurgonetkaAPI({
    clientId,
    clientSecret,
    username,
    password,
    testMode: process.env.NODE_ENV !== 'production'
  })
}

// Helper function to create shipment from order
export async function createFurgonetkaShipmentFromOrder(order: any, serviceId?: string) {
  const furgonetka = await getFurgonetkaAPI()
  
  // Parse addresses
  const shippingAddress = typeof order.shippingAddress === 'string' 
    ? JSON.parse(order.shippingAddress) 
    : order.shippingAddress

  // Calculate parcel dimensions based on items
  const parcel: FurgonetkaParcel = calculateParcelDimensions(order.items)

  // If no service specified, find cheapest
  if (!serviceId) {
    const cheapest = await furgonetka.getCheapestShipping(
      '00-001', // Our postal code (replace with actual)
      shippingAddress.postcode,
      parcel
    )
    serviceId = cheapest?.id
  }

  if (!serviceId) {
    throw new Error('No shipping service available')
  }

  const shipment: FurgonetkaShipment = {
    receiver: {
      firstName: shippingAddress.firstName,
      lastName: shippingAddress.lastName,
      street: shippingAddress.address1,
      buildingNumber: shippingAddress.address2 || '1',
      postalCode: shippingAddress.postcode,
      city: shippingAddress.city,
      countryCode: shippingAddress.country || 'PL',
      email: order.customerEmail,
      phone: order.customerPhone
    },
    parcels: [parcel],
    serviceId,
    reference: `PrintPilot-${order.externalId}`,
    comment: `Order #${order.externalId} - ${order.items.length} items`
  }

  return furgonetka.createShipment(shipment)
}

function calculateParcelDimensions(items: any[]): FurgonetkaParcel {
  // Basic calculation - you might want to make this more sophisticated
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  
  return {
    weight: Math.max(0.5, itemCount * 0.3), // 300g per item, min 500g
    width: 30,
    height: 20,
    depth: Math.max(5, itemCount * 2), // 2cm per item, min 5cm
    insuranceValue: items.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0)
  }
}