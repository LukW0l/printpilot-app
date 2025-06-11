import { NextRequest, NextResponse } from 'next/server'
import { getApaczkaAPI } from '@/lib/apaczka'
import { getFurgonetkaAPI } from '@/lib/furgonetka'

interface CalculateRequest {
  weight: number
  width: number
  height: number
  depth: number
  fromPostalCode: string
  toPostalCode: string
  insuranceValue?: number
}

interface ShippingService {
  provider: string
  serviceName: string
  price: number
  currency: string
  deliveryTime: string
  serviceId: string
}

export async function POST(request: NextRequest) {
  try {
    console.log('🚀🚀🚀 SHIPPING CALCULATE API CALLED - NEW VERSION 2.0 🚀🚀🚀')
    const data: CalculateRequest = await request.json()
    
    const { weight, width, height, depth, fromPostalCode, toPostalCode, insuranceValue = 0 } = data
    
    // Validate required fields
    if (!weight || !width || !height || !depth || !toPostalCode) {
      return NextResponse.json({
        error: 'Wszystkie wymiary paczki i kod pocztowy odbiorcy są wymagane'
      }, { status: 400 })
    }

    const services: ShippingService[] = []
    const errors: string[] = []

    // Get Apaczka services
    try {
      console.log('🚀 Getting Apaczka services...')
      const apaczka = await getApaczkaAPI()
      
      const apaczkaServices = await apaczka.getServices(fromPostalCode, toPostalCode, {
        weight,
        width,
        height,
        depth,
        insuranceValue
      })

      console.log('📦 Apaczka services:', apaczkaServices)

      if (apaczkaServices && apaczkaServices.length > 0) {
        // Filter to most popular services only
        const popularServices = apaczkaServices.filter(service => 
          ['21', '41', '42', '23', '50', '60'].includes(service.id)
        )
        
        services.push(...(popularServices.length > 0 ? popularServices : apaczkaServices.slice(0, 5)).map(service => ({
          provider: 'Apaczka.pl',
          serviceName: (service as any).name || (service as any).service_name || 'Standardowa',
          price: service.price?.gross || parseFloat((service as any).price_gross || (service as any).price || '15.99'),
          currency: service.price?.currency || 'PLN',
          deliveryTime: (service as any).deliveryTime || (service as any).delivery_time || '1-2 dni',
          serviceId: service.id || (service as any).service_id || ''
        })))
      }
    } catch (error: any) {
      console.error('❌ Apaczka error:', error)
      errors.push(`Apaczka.pl: ${error.message}`)
    }

    // Get Furgonetka services  
    try {
      console.log('🚀 Getting Furgonetka services...')
      const furgonetka = await getFurgonetkaAPI()
      
      const furgonetkaServices = await furgonetka.getServices(fromPostalCode, toPostalCode, {
        weight,
        width,
        height,
        depth,
        insuranceValue
      })

      console.log('📦 Furgonetka services:', furgonetkaServices)

      if (furgonetkaServices && furgonetkaServices.length > 0) {
        services.push(...furgonetkaServices.map(service => ({
          provider: 'Furgonetka.pl',
          serviceName: service.name || 'Standardowa',
          price: service.price?.gross || service.price?.net || parseFloat((service as any).price || '0'),
          currency: service.price?.currency || 'PLN',
          deliveryTime: service.deliveryTime || (service as any).delivery_time || '1-3 dni',
          serviceId: service.id || ''
        })))
      }
    } catch (error: any) {
      console.error('❌ Furgonetka error:', error)
      errors.push(`Furgonetka.pl: ${error.message}`)
    }

    // Sort services by price
    services.sort((a, b) => a.price - b.price)

    console.log('✅ Final services:', services)
    console.log('⚠️ Errors:', errors)

    return NextResponse.json({
      success: true,
      services,
      errors: errors.length > 0 ? errors : undefined,
      message: services.length > 0 
        ? `Znaleziono ${services.length} usług wysyłki`
        : 'Nie znaleziono dostępnych usług wysyłki'
    })

  } catch (error: any) {
    console.error('💥 Calculate shipping error:', error)
    
    return NextResponse.json({
      error: 'Błąd podczas sprawdzania cen wysyłki',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 })
  }
}