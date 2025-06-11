import { NextRequest, NextResponse } from 'next/server'
import { getFurgonetkaAPI } from '@/lib/furgonetka'

export async function GET(request: NextRequest) {
  try {
    console.log('Testing Furgonetka API connection...')
    
    const furgonetka = await getFurgonetkaAPI()
    
    // Test basic API connection by getting account info
    const accountInfo = await furgonetka.getAccountInfo()
    
    console.log('Furgonetka API test successful')
    console.log('Account info:', accountInfo)
    
    return NextResponse.json({
      success: true,
      message: 'Połączenie z Furgonetka.pl działa poprawnie',
      data: {
        status: 'OAuth authentication successful',
        accountInfo: accountInfo,
        companiesCount: accountInfo.companies?.length || 0
      }
    })
    
  } catch (error: any) {
    console.error('Furgonetka API test failed:', error)
    
    let errorMessage = error.message || 'Nieznany błąd'
    
    // Handle specific OAuth errors
    if (error.message?.includes('invalid_grant')) {
      errorMessage = 'Nieprawidłowe dane logowania (email/hasło)'
    } else if (error.message?.includes('invalid_client')) {
      errorMessage = 'Nieprawidłowe Client ID lub Client Secret'
    } else if (error.message?.includes('unauthorized')) {
      errorMessage = 'Brak autoryzacji - sprawdź dane OAuth2'
    } else if (error.message?.includes('not found in database')) {
      errorMessage = 'Skonfiguruj dane Furgonetka.pl w Ustawieniach > Wysyłka'
    } else if (error.message?.includes('fetch')) {
      errorMessage = 'Błąd połączenia z serwerem Furgonetka.pl'
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 400 })
  }
}