interface ApaczkaConfig {
  apiKey: string // App Secret
  appId: string  // App ID
  testMode?: boolean
}

interface ApaczkaAddress {
  firstName?: string
  lastName?: string
  companyName?: string
  street: string
  buildingNumber: string
  apartmentNumber?: string
  postalCode: string
  city: string
  countryCode: string
  email?: string
  phone?: string
}

interface ApaczkaParcel {
  weight: number
  width: number
  height: number
  depth: number
  insuranceValue?: number
}

interface ApaczkaShipment {
  receiver: ApaczkaAddress
  sender?: ApaczkaAddress
  parcels: ApaczkaParcel[]
  serviceId: string
  additionalServices?: string[]
  comment?: string
  reference?: string
  codAmount?: number // Cash on delivery amount
}

interface ApaczkaService {
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

export class ApaczkaAPI {
  private config: ApaczkaConfig
  private baseUrl: string

  constructor(config: ApaczkaConfig) {
    this.config = config
    // Apaczka API v2 base URL
    this.baseUrl = 'https://www.apaczka.pl/api/v2'
  }

  private generateSignature(appId: string, route: string, data: string, expires: number): string {
    const crypto = require('crypto')
    // Route in signature must include trailing slash to match endpoint URL
    const routeWithSlash = route.endsWith('/') ? route : `${route}/`
    const stringToSign = `${appId}:${routeWithSlash}:${data}:${expires}`
    console.log(`[SIGNATURE DEBUG] Route with slash: ${routeWithSlash}`)
    console.log(`[SIGNATURE DEBUG] String to sign: ${stringToSign}`)
    return crypto.createHmac('sha256', this.config.apiKey).update(stringToSign).digest('hex')
  }

  async makeRequest(route: string, data: any = {}) {
    const url = `${this.baseUrl}/${route}/`
    const expires = Math.floor(Date.now() / 1000) + (10 * 60) // 10 minutes from now
    
    // Handle special cases for request data format based on OpenAPI spec
    let requestData: string
    if (route === 'service_structure' || route.startsWith('waybill/') || route.startsWith('order/')) {
      requestData = '[]'
    } else if (route === 'orders' && Object.keys(data).length === 0) {
      // Orders endpoint requires page and limit
      requestData = JSON.stringify({ page: 1, limit: 10 })
    } else {
      requestData = JSON.stringify(data)
    }
    
    const signature = this.generateSignature(this.config.appId, route, requestData, expires)
    
    console.log(`Making request to: ${url}`)
    console.log(`Route: ${route}`)
    console.log(`App ID: ${this.config.appId}`)
    console.log(`API Key length: ${this.config.apiKey.length}`)
    console.log(`Test mode: ${this.config.testMode}`)
    console.log(`Expires: ${expires}`)
    console.log(`Request data: ${requestData}`)
    console.log(`String to sign: ${this.config.appId}:${route}:${requestData}:${expires}`)
    console.log(`Signature: ${signature}`)
    
    const formData = new URLSearchParams({
      app_id: this.config.appId,
      request: requestData,
      expires: expires.toString(),
      signature: signature
    })

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: formData
    })

    console.log(`Response status: ${response.status}`)
    console.log(`Response headers:`, Object.fromEntries(response.headers.entries()))

    const responseText = await response.text()
    console.log(`Response body (first 500 chars):`, responseText.substring(0, 500))

    if (!response.ok) {
      throw new Error(`Apaczka API Error: ${response.status} ${response.statusText} - ${responseText}`)
    }

    try {
      const result = JSON.parse(responseText)
      
      // Check if API returned an error status
      if (result.status === 400) {
        throw new Error(`API Error: ${result.message || 'Unknown error'}`)
      }
      
      return result
    } catch (e) {
      if (e instanceof Error && e.message.startsWith('API Error:')) {
        throw e
      }
      throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}`)
    }
  }

  async getServices(fromPostalCode: string, toPostalCode: string, parcel: ApaczkaParcel, codAmount?: number): Promise<ApaczkaService[]> {
    console.log('💰💰💰 APACZKA getServices CALLED - NEW PRICING LOGIC v2.0 💰💰💰')
    console.log('🔍 Apaczka getServices request for pricing - NEW VERSION')
    
    // First, get available services structure
    try {
      const servicesResponse = await this.makeRequest('service_structure', [])
      const availableServices = servicesResponse.response?.services || []
      
      console.log(`📋 Found ${availableServices.length} available services`)
      
      // Filter to popular domestic services only
      const popularServiceIds = ['21', '41', '42', '23', '50', '60']
      const popularServices = availableServices.filter((service: any) => 
        popularServiceIds.includes(service.service_id) && service.domestic === "1"
      )
      
      console.log(`🎯 Filtered to ${popularServices.length} popular services`)
      
      // For each service, try to get pricing using order_valuation
      const servicesWithPrices: ApaczkaService[] = []
      
      for (const service of popularServices) {
        try {
          // Use exact API structure from OpenAPI spec
          const pricingData = {
            order: {
              service_id: parseInt(service.service_id),
              address: {
                sender: {
                  country_code: 'PL',
                  name: 'PrintPilot Sp. z o.o.',
                  line1: 'ul. Przykładowa 1',
                  line2: '',
                  postal_code: fromPostalCode,
                  city: 'Warszawa',
                  is_residential: 0,
                  contact_person: 'PrintPilot System',
                  email: 'info@printpilot.pl',
                  phone: '123456789'
                },
                receiver: {
                  country_code: 'PL',
                  name: 'Klient Testowy',
                  line1: 'ul. Testowa 1',
                  line2: '',
                  postal_code: toPostalCode,
                  city: 'Kraków',
                  is_residential: 1,
                  contact_person: 'Jan Kowalski',
                  email: 'test@example.com',
                  phone: '987654321'
                }
              },
              option: [], // Options will be handled separately
              cod: codAmount ? {
                amount: Math.round(codAmount * 100), // COD amount in grosz
                bankaccount: '' // Bank account can be empty for standard COD
              } : undefined,
              shipment_value: Math.round((parcel.insuranceValue || 100) * 100), // Convert to grosz
              pickup: {
                type: service.pickup_courier === "1" ? 'COURIER' : 'SELF',
                date: new Date().toISOString().split('T')[0], // Today
                hours_from: '09:00',
                hours_to: '17:00'
              },
              shipment: [{
                dimension1: Math.round(parcel.width), // length
                dimension2: Math.round(parcel.depth), // width
                dimension3: Math.round(parcel.height), // height
                weight: parcel.weight,
                is_nstd: 0,
                shipment_type_code: 'PACZKA'
              }],
              comment: '',
              content: 'Oprawione obrazy'
            }
          }
          
          console.log(`💰 Getting price for service ${service.service_id} (${service.name})`)
          console.log('Request data:', JSON.stringify(pricingData, null, 2))
          
          // Try order_valuation first, then fallback to pricing
          let priceResponse
          try {
            priceResponse = await this.makeRequest('order_valuation', pricingData)
          } catch (error: any) {
            console.log(`❌ order_valuation failed for ${service.service_id}, trying pricing endpoint:`, error.message)
            // Try alternative pricing endpoint
            const simplePricingData = {
              from_postal_code: fromPostalCode,
              to_postal_code: toPostalCode,
              weight: parcel.weight,
              length: parcel.width,
              width: parcel.depth,
              height: parcel.height,
              service_id: service.service_id
            }
            priceResponse = await this.makeRequest('pricing', simplePricingData)
          }
          
          console.log('Price response:', JSON.stringify(priceResponse, null, 2))
          
          // Response structure according to API spec: response.price_table
          if (priceResponse.response && priceResponse.response.price_table) {
            // Get the first price from price_table (it's an object keyed by numbers)
            const priceTable = priceResponse.response.price_table
            const firstKey = Object.keys(priceTable)[0]
            
            if (firstKey && priceTable[firstKey]) {
              const pricing = priceTable[firstKey]
              servicesWithPrices.push({
                id: service.service_id,
                name: service.name,
                price: {
                  net: parseFloat(pricing.price || '0') / 100, // Convert from grosz to PLN
                  gross: parseFloat(pricing.price_gross || '0') / 100, // Convert from grosz to PLN
                  currency: 'PLN'
                },
                deliveryTime: service.delivery_time || '1-2 dni robocze',
                supplier: service.supplier || 'Apaczka'
              })
            } else {
              throw new Error('No pricing in price_table')
            }
          } else {
            throw new Error('No price_table in response')
          }
        } catch (error: any) {
          console.log(`❌ Failed to get price for service ${service.service_id}: ${error.message}`)
          // Add service with placeholder price if pricing fails
          servicesWithPrices.push({
            id: service.service_id,
            name: service.name,
            price: {
              net: 15.00,
              gross: 18.45,
              currency: 'PLN'
            },
            deliveryTime: service.delivery_time || '1-2 dni robocze',
            supplier: service.supplier || 'Apaczka'
          })
        }
      }
      
      console.log(`✅ Returning ${servicesWithPrices.length} services with pricing`)
      return servicesWithPrices
      
    } catch (error: any) {
      console.log('❌ Failed to get services structure:', error.message)
      return []
    }
  }

  async getPoints(postalCode: string, pointType: string = 'inpost') {
    const requestData = { postal_code: postalCode }
    
    const response = await this.makeRequest(`points/${pointType}`, requestData)
    return response.points || []
  }

  async createShipment(shipment: ApaczkaShipment) {
    // Get company settings from config
    const { prisma } = await import('@/lib/prisma')
    const config = await prisma.systemConfig.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    })
    
    // Use config values or defaults
    const companyName = config?.companyName || 'PrintPilot'
    const companyStreet = (config as any)?.companyStreet || 'ul. Marii Dąbrowskiej 30A'
    const companyPostalCode = (config as any)?.companyPostalCode || '42-520'
    const companyCity = (config as any)?.companyCity || 'Dąbrowa Górnicza'
    const companyEmail = config?.companyEmail || 'zreq5mjdf@gmail.com'
    const companyPhone = config?.companyPhone || '791888999'
    const companyCountry = (config as any)?.companyCountry || 'PL'
    
    // Convert our shipment format to Apaczka API v2 Order format
    const orderData = {
      order: {
        service_id: parseInt(shipment.serviceId), // Convert to integer
        address: {
          sender: {
            country_code: companyCountry,
            name: companyName,
            line1: companyStreet,
            line2: '',
            postal_code: companyPostalCode,
            city: companyCity,
            is_residential: 0,
            contact_person: companyName,
            email: companyEmail,
            phone: companyPhone
          },
          receiver: {
            country_code: shipment.receiver.countryCode,
            name: `${shipment.receiver.firstName} ${shipment.receiver.lastName}`,
            line1: shipment.receiver.street,
            line2: shipment.receiver.buildingNumber || '',
            postal_code: shipment.receiver.postalCode,
            city: shipment.receiver.city,
            is_residential: 1,
            contact_person: `${shipment.receiver.firstName} ${shipment.receiver.lastName}`,
            email: shipment.receiver.email,
            phone: shipment.receiver.phone
          }
        },
        option: [], // Options will be handled separately
        cod: shipment.codAmount ? {
          amount: Math.round(shipment.codAmount * 100), // COD amount in grosz
          ...(process.env.APACZKA_COD_BANK_ACCOUNT ? { bankaccount: process.env.APACZKA_COD_BANK_ACCOUNT } : {})
        } : undefined,
        shipment_value: shipment.codAmount ? 
          Math.max(Math.round(shipment.codAmount * 100), Math.round((shipment.parcels[0]?.insuranceValue || 100) * 100)) :
          Math.round((shipment.parcels[0]?.insuranceValue || 100) * 100), // Convert to grosz, ensure it's at least equal to COD amount
        pickup: {
          type: 'COURIER',
          date: new Date().toISOString().split('T')[0], // Today - if not available, API will suggest next available date
          hours_from: '09:00',
          hours_to: '17:00'
        },
        shipment: shipment.parcels.map(parcel => ({
          type: 'PACZKA',
          dimension1: Math.round(parcel.width || 30), // Length in cm
          dimension2: Math.round(parcel.height || 20), // Width in cm  
          dimension3: Math.round(parcel.depth || 5), // Height in cm
          weight: Math.round(parcel.weight || 0.5), // Weight in kg
          content: shipment.comment || 'Artwork print'
        })),
        comment: shipment.comment || '',
        content: shipment.comment || 'Artwork print'
      }
    }

    const response = await this.makeRequest('order_send', orderData)
    return response
  }

  async getShipmentLabel(orderId: string, format: 'pdf' | 'zpl' = 'pdf') {
    // According to OpenAPI spec, waybill endpoint uses order_id in URL path
    // and request body should be empty ("[]")
    const response = await this.makeRequest(`waybill/${orderId}`, {})
    return response
  }

  async getShipmentStatus(orderId: string) {
    const response = await this.makeRequest(`order/${orderId}`, {})
    return response.response || {}
  }

  async getOrdersList(page: number = 1, limit: number = 100) {
    const requestData = { page, limit }
    const response = await this.makeRequest('orders', requestData)
    return response.response?.data || []
  }

  // Helper method to get InPost lockers specifically
  async getInPostLockers(postalCode: string) {
    return this.getPoints(postalCode, 'inpost')
  }

  // Helper method to calculate cheapest shipping option
  async getCheapestShipping(fromPostalCode: string, toPostalCode: string, parcel: ApaczkaParcel, codAmount?: number) {
    const services = await this.getServices(fromPostalCode, toPostalCode, parcel, codAmount)
    
    if (services.length === 0) return null
    
    return services.reduce((cheapest, current) => 
      current.price.gross < cheapest.price.gross ? current : cheapest
    )
  }
}

// Get Apaczka API instance with database configuration
export async function getApaczkaAPI(): Promise<ApaczkaAPI> {
  // Try to get settings from database first
  try {
    const { prisma } = await import('@/lib/prisma')
    const config = await prisma.systemConfig.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    })
    
    if (config?.apaczkaApiKey && config?.apaczkaAppId) {
      return new ApaczkaAPI({
        apiKey: config.apaczkaApiKey,
        appId: config.apaczkaAppId,
        testMode: config.apaczkaTestMode || false
      })
    }
  } catch (error) {
    console.warn('Could not load Apaczka settings from database:', error)
  }
  
  // Fallback to environment variables
  const apiKey = process.env.APACZKA_API_KEY
  const appId = process.env.APACZKA_APP_ID
  
  if (!apiKey || !appId) {
    throw new Error('Apaczka API credentials not found in database or environment variables. Please configure them in Settings > Shipping.')
  }
  
  return new ApaczkaAPI({
    apiKey,
    appId,
    testMode: process.env.NODE_ENV !== 'production'
  })
}

// Synchronous version for cases where we need it immediately
export function getApaczkaAPISync(): ApaczkaAPI {
  const apiKey = process.env.APACZKA_API_KEY
  const appId = process.env.APACZKA_APP_ID
  
  if (!apiKey || !appId) {
    throw new Error('APACZKA_API_KEY and APACZKA_APP_ID not found in environment variables')
  }
  
  return new ApaczkaAPI({
    apiKey,
    appId,
    testMode: process.env.NODE_ENV !== 'production'
  })
}

// Helper function to create shipment from order
export async function createShipmentFromOrder(order: any, serviceId?: string) {
  const apaczka = await getApaczkaAPI()
  
  // Parse addresses
  const shippingAddress = typeof order.shippingAddress === 'string' 
    ? JSON.parse(order.shippingAddress) 
    : order.shippingAddress

  const billingAddress = typeof order.billingAddress === 'string'
    ? JSON.parse(order.billingAddress)
    : order.billingAddress

  // Calculate parcel dimensions based on items
  const parcel: ApaczkaParcel = calculateParcelDimensions(order.items)

  // Check if order is COD (Cash on Delivery)
  const isCOD = order.paymentStatus === 'COD' || order.paymentMethod?.toLowerCase().includes('cod') || order.paymentMethod?.toLowerCase().includes('pobraniem')
  const codAmount = isCOD ? order.totalAmount : undefined

  // If no service specified, find cheapest
  if (!serviceId) {
    const cheapest = await apaczka.getCheapestShipping(
      '00-001', // Our postal code (replace with actual)
      shippingAddress.postcode,
      parcel,
      codAmount
    )
    serviceId = cheapest?.id
  }

  if (!serviceId) {
    throw new Error('No shipping service available')
  }

  const shipment: ApaczkaShipment = {
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
    comment: `Order #${order.externalId} - ${order.items.length} items${isCOD ? ' (COD)' : ''}`,
    codAmount: codAmount
  }

  return apaczka.createShipment(shipment)
}

export function calculateParcelDimensions(items: any[]): ApaczkaParcel {
  // Calculate package size based on largest artwork dimensions in order
  // Improved logic: depth = 4cm per item, weight multiplied by quantity
  
  let maxWidth = 20 // minimum package width
  let maxHeight = 15 // minimum package height
  let totalItems = 0
  
  // Parse dimensions from order items and find the largest + count total items
  items.forEach(item => {
    totalItems += item.quantity // Count total quantity of all items
    
    // Check both dimensions field and product name for dimensions
    const dimensionSources = [
      item.dimensions,
      item.name // Check product name as fallback
    ].filter(Boolean)
    
    for (const source of dimensionSources) {
      if (source) {
        // Try multiple regex patterns to catch dimensions
        const patterns = [
          /(\d+)x(\d+)/i,
          /(\d+)\s*×\s*(\d+)/i,
          /(\d+)\s*\*\s*(\d+)/i,
          /-\s*(\d+)x(\d+)/i,
          /(\d+)\/(\d+)/i
        ]
        
        let matched = false
        for (const pattern of patterns) {
          const dimensionMatch = source.match(pattern)
          if (dimensionMatch) {
            const width = parseInt(dimensionMatch[1])
            const height = parseInt(dimensionMatch[2])
            
            maxWidth = Math.max(maxWidth, width)
            maxHeight = Math.max(maxHeight, height)
            matched = true
            break
          }
        }
        
        if (matched) break
      }
    }
  })
  
  // Improved calculation: depth = 4cm per item, weight multiplied by quantity
  const depthPerItem = 4
  const packageWidth = maxWidth
  const packageHeight = maxHeight
  const packageDepth = depthPerItem * totalItems
  
  // Weight calculation based on area and quantity
  const area = (packageWidth * packageHeight) / 10000 // area in m²
  let weightPerItem = 2.0
  
  if (area >= 0.96) { // 120x80 = 0.96m²
    weightPerItem = 5.0
  } else if (area >= 0.35) { // 70x50 = 0.35m²
    weightPerItem = 3.0
  } else if (area >= 0.24) { // 60x40 = 0.24m²
    weightPerItem = 2.0
  } else {
    weightPerItem = Math.max(1.0, area * 8) // roughly 8kg per m²
  }
  
  const totalWeight = weightPerItem * totalItems
  const totalValue = items.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0)
  
  console.log(`📦 Calculated parcel: ${packageWidth}x${packageHeight}x${packageDepth}cm, ${totalWeight}kg for ${totalItems} items`)
  
  return {
    weight: totalWeight,
    width: packageWidth,
    height: packageHeight, 
    depth: packageDepth,
    insuranceValue: totalValue
  }
}