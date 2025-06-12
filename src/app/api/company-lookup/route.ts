import { NextRequest, NextResponse } from 'next/server'
import { lookupCompanyByNIP, validateNIP } from '@/lib/nip-lookup'

/**
 * API endpoint do wyszukiwania danych firmy po NIP
 * GET /api/company-lookup?nip=1234567890
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const nip = searchParams.get('nip')
    
    if (!nip) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Brak parametru NIP' 
        }, 
        { status: 400 }
      )
    }
    
    // Szybka walidacja formatu
    if (!validateNIP(nip)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Nieprawidłowy format NIP. NIP musi mieć 10 cyfr i prawidłową sumę kontrolną.' 
        }, 
        { status: 400 }
      )
    }
    
    console.log(`🔍 Looking up company data for NIP: ${nip}`)
    
    // Wyszukaj dane firmy
    const result = await lookupCompanyByNIP(nip)
    
    if (result.success) {
      console.log(`✅ Found company: ${result.company?.name}`)
      
      return NextResponse.json({
        success: true,
        company: result.company,
        message: 'Dane firmy zostały pobrane pomyślnie'
      })
    } else {
      console.log(`❌ Company lookup failed: ${result.error}`)
      
      return NextResponse.json(
        { 
          success: false, 
          error: result.error 
        }, 
        { status: 404 }
      )
    }
    
  } catch (error) {
    console.error('Company lookup API error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Wystąpił błąd podczas wyszukiwania danych firmy' 
      }, 
      { status: 500 }
    )
  }
}

/**
 * Walidacja NIP bez pobierania danych
 * POST /api/company-lookup/validate
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nip } = body
    
    if (!nip) {
      return NextResponse.json(
        { 
          valid: false, 
          error: 'Brak numeru NIP' 
        }, 
        { status: 400 }
      )
    }
    
    const isValid = validateNIP(nip)
    
    return NextResponse.json({
      valid: isValid,
      nip: nip.replace(/[\s\-]/g, ''), // Zwróć oczyszczony NIP
      message: isValid ? 'NIP jest prawidłowy' : 'Nieprawidłowy format NIP'
    })
    
  } catch (error) {
    console.error('NIP validation error:', error)
    
    return NextResponse.json(
      { 
        valid: false, 
        error: 'Wystąpił błąd podczas walidacji NIP' 
      }, 
      { status: 500 }
    )
  }
}