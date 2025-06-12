/**
 * NIP Lookup Service - automatyczne pobieranie danych firmy po NIP
 * Wykorzystuje darmowe API Ministerstwa Finansów (KAS)
 */

export interface CompanyData {
  name: string
  nip: string
  regon?: string
  krs?: string
  address: string
  city?: string
  postalCode?: string
  street?: string
  vatStatus: string
  bankAccount?: string
  registrationDate?: string
}

export interface NipLookupResult {
  success: boolean
  company?: CompanyData
  error?: string
}

/**
 * Walidacja NIP - sprawdza czy NIP ma poprawny format i sumę kontrolną
 */
export function validateNIP(nip: string): boolean {
  // Usuń spacje, myślniki i inne znaki
  const cleanNip = nip.replace(/[\s\-]/g, '')
  
  // Sprawdź czy ma 10 cyfr
  if (!/^\d{10}$/.test(cleanNip)) {
    return false
  }
  
  // Sprawdź sumę kontrolną
  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7]
  let sum = 0
  
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanNip[i]) * weights[i]
  }
  
  const checksum = sum % 11
  const controlDigit = parseInt(cleanNip[9])
  
  return checksum === 10 ? controlDigit === 0 : checksum === controlDigit
}

/**
 * Parsowanie adresu z formatu "ul. Nazwa 123, 00-000 Miasto"
 */
function parseAddress(fullAddress: string): {
  street?: string
  postalCode?: string  
  city?: string
} {
  const parts = fullAddress.split(', ')
  
  if (parts.length >= 2) {
    const street = parts[0]
    const cityPart = parts[parts.length - 1]
    
    // Spróbuj wyodrębnić kod pocztowy i miasto
    const postalMatch = cityPart.match(/^(\d{2}-\d{3})\s+(.+)$/)
    
    if (postalMatch) {
      return {
        street,
        postalCode: postalMatch[1],
        city: postalMatch[2]
      }
    }
    
    return {
      street,
      city: cityPart
    }
  }
  
  return {}
}

/**
 * Wyszukaj dane firmy po NIP używając API Ministerstwa Finansów
 */
export async function lookupCompanyByNIP(nip: string): Promise<NipLookupResult> {
  try {
    // Walidacja NIP
    if (!validateNIP(nip)) {
      return {
        success: false,
        error: 'Nieprawidłowy format NIP'
      }
    }
    
    // Usuń spacje i myślniki
    const cleanNIP = nip.replace(/[\s\-]/g, '')
    
    // Format daty dla API (YYYY-MM-DD)
    const today = new Date().toISOString().split('T')[0]
    
    // Wywołaj API KAS
    const response = await fetch(
      `https://wl-api.mf.gov.pl/api/search/nip/${cleanNIP}?date=${today}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'PrintPilot/1.0'
        }
      }
    )
    
    if (!response.ok) {
      return {
        success: false,
        error: `API Error: ${response.status} - ${response.statusText}`
      }
    }
    
    const data = await response.json()
    
    // Sprawdź czy znaleziono firmę
    if (!data.result || !data.result.subject) {
      return {
        success: false,
        error: 'Nie znaleziono firmy o podanym NIP'
      }
    }
    
    const subject = data.result.subject
    const addressParts = parseAddress(subject.workingAddress || '')
    
    const companyData: CompanyData = {
      name: subject.name,
      nip: subject.nip,
      regon: subject.regon,
      krs: subject.krs,
      address: subject.workingAddress,
      ...addressParts,
      vatStatus: subject.statusVat || 'Nieznany',
      bankAccount: data.result.accountNumbers?.[0]?.accountNumber,
      registrationDate: subject.registrationLegalDate
    }
    
    return {
      success: true,
      company: companyData
    }
    
  } catch (error) {
    console.error('NIP lookup error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Nieznany błąd'
    }
  }
}

/**
 * Test NIP lookup z przykładowym NIP
 */
export async function testNipLookup(): Promise<void> {
  console.log('🔍 Testing NIP lookup...')
  
  const testNip = '6462978128'
  const result = await lookupCompanyByNIP(testNip)
  
  if (result.success && result.company) {
    console.log('✅ Test successful:')
    console.log(`   Firma: ${result.company.name}`)
    console.log(`   Adres: ${result.company.address}`)
    console.log(`   Status VAT: ${result.company.vatStatus}`)
  } else {
    console.log('❌ Test failed:', result.error)
  }
}