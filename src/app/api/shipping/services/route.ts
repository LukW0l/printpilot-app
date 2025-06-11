import { NextRequest, NextResponse } from 'next/server'
import { getApaczkaAPI, calculateParcelDimensions } from '@/lib/apaczka'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId, toPostalCode, parcel } = body

    console.log('🚚 Getting shipping services for:', { orderId, toPostalCode, parcel })

    // Get Apaczka API instance
    const apaczka = await getApaczkaAPI()
    
    // Default parcel dimensions if not provided
    const defaultParcel = {
      weight: 1, // 1kg
      width: 30, // 30cm
      height: 20, // 20cm
      depth: 5,  // 5cm
      insuranceValue: 100, // 100 PLN
      ...parcel
    }

    // Get company postal code from system config or use default
    let fromPostalCode = '00-001' // Default Warsaw
    try {
      const config = await prisma.systemConfig.findFirst({
        where: { isActive: true }
      })
      if (config?.companyPostalCode) {
        fromPostalCode = config.companyPostalCode
      }
    } catch (error) {
      console.warn('Could not load company postal code, using default')
    }

    // If orderId is provided, get order details to calculate parcel size
    if (orderId) {
      try {
        const order = await prisma.order.findUnique({
          where: { id: orderId },
          include: { items: true }
        })

        if (order) {
          // Calculate parcel dimensions based on order items using proper function
          const calculatedParcel = calculateParcelDimensions(order.items)
          Object.assign(defaultParcel, calculatedParcel)

          // Parse shipping address to get postal code
          const shippingAddress = typeof order.shippingAddress === 'string' 
            ? JSON.parse(order.shippingAddress) 
            : order.shippingAddress
          
          if (shippingAddress?.postcode && !toPostalCode) {
            body.toPostalCode = shippingAddress.postcode
          }
          
          // Check if order is COD for pricing
          const isCOD = order.paymentStatus === 'COD' || order.paymentMethod?.toLowerCase().includes('cod') || order.paymentMethod?.toLowerCase().includes('pobraniem')
          if (isCOD) {
            body.codAmount = order.totalAmount
          }
        }
      } catch (error) {
        console.error('Error loading order details:', error)
      }
    }

    const destinationPostalCode = toPostalCode || body.toPostalCode || '31-000' // Default Krakow

    console.log(`📍 Getting services from ${fromPostalCode} to ${destinationPostalCode}`)
    console.log('📦 Parcel details:', defaultParcel)

    // Get available services from Apaczka (including COD if applicable)
    const services = await apaczka.getServices(fromPostalCode, destinationPostalCode, defaultParcel, body.codAmount)

    console.log(`✅ Found ${services.length} shipping services`)

    // Enhanced service data with recommendations
    const enhancedServices = services.map(service => ({
      ...service,
      recommended: service.id === '21', // InPost is usually recommended
      icon: getServiceIcon(service.id),
      description: getServiceDescription(service.id),
      deliveryDays: getDeliveryDays(service.id)
    })).sort((a, b) => {
      // Sort by recommendation first, then by price
      if (a.recommended && !b.recommended) return -1
      if (!a.recommended && b.recommended) return 1
      return a.price.gross - b.price.gross
    })

    return NextResponse.json({
      success: true,
      services: enhancedServices,
      fromPostalCode,
      toPostalCode: destinationPostalCode,
      parcel: defaultParcel,
      source: 'real_api'
    })

  } catch (error) {
    console.error('Error getting shipping services:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get shipping services', 
        details: error instanceof Error ? error.message : 'Unknown error',
        services: getFallbackServices() // Return fallback services
      },
      { status: 500 }
    )
  }
}

function getServiceIcon(serviceId: string): string {
  const icons: Record<string, string> = {
    '21': '📦', // InPost Paczkomaty
    '23': '📦', // InPost Kurier
    '41': '🚚', // Apaczka Kurier
    '42': '⚡', // Apaczka Kurier Ekspresowy
    '50': '🏪', // Paczka w Ruchu
    '60': '📮'  // Poczta Polska
  }
  return icons[serviceId] || '📦'
}

function getServiceDescription(serviceId: string): string {
  const descriptions: Record<string, string> = {
    '21': 'Dostawa do paczkomatu InPost - wygodnie i tanio',
    '23': 'Kurier InPost do drzwi - szybko i bezpiecznie',
    '41': 'Kurier standardowy - dostawa do drzwi',
    '42': 'Kurier ekspresowy - dostawa w 24h',
    '50': 'Paczka w Ruchu - odbiór w sklepie partnerskim',
    '60': 'Poczta Polska - tradycyjna dostawa pocztowa'
  }
  return descriptions[serviceId] || 'Dostawa kurierska'
}

function getDeliveryDays(serviceId: string): string {
  const days: Record<string, string> = {
    '21': '1-2 dni robocze',
    '23': '1-2 dni robocze', 
    '41': '1-3 dni robocze',
    '42': 'do 24h',
    '50': '2-3 dni robocze',
    '60': '3-5 dni roboczych'
  }
  return days[serviceId] || '2-3 dni robocze'
}

function getFallbackServices() {
  // Return basic fallback services if API fails
  return [
    {
      id: '21',
      name: 'InPost Paczkomaty',
      price: { net: 12.00, gross: 14.76, currency: 'PLN' },
      deliveryTime: '1-2 dni robocze',
      supplier: 'InPost',
      recommended: true,
      icon: '📦',
      description: 'Dostawa do paczkomatu InPost',
      deliveryDays: '1-2 dni robocze'
    },
    {
      id: '41',
      name: 'Kurier standardowy',
      price: { net: 16.00, gross: 19.68, currency: 'PLN' },
      deliveryTime: '1-3 dni robocze',
      supplier: 'Apaczka',
      recommended: false,
      icon: '🚚',
      description: 'Kurier standardowy do drzwi',
      deliveryDays: '1-3 dni robocze'
    }
  ]
}