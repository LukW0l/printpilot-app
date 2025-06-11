import axios from 'axios'

interface ShippingLabel {
  trackingNumber: string
  labelUrl: string
  provider: string
  cost: number
}

interface ShippingRate {
  provider: string
  service: string
  cost: number
  estimatedDays: number
}

interface Address {
  name: string
  company?: string
  street: string
  city: string
  postalCode: string
  country: string
  phone?: string
  email?: string
}

// InPost API Client
export class InPostClient {
  private apiKey: string
  private apiUrl: string

  constructor(apiKey: string, sandbox: boolean = false) {
    this.apiKey = apiKey
    this.apiUrl = sandbox 
      ? 'https://sandbox-api-shipx-pl.easypack24.net/v1'
      : 'https://api-shipx-pl.easypack24.net/v1'
  }

  async createShipment(sender: Address, receiver: Address, parcelSize: string): Promise<ShippingLabel> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/shipments`,
        {
          receiver: {
            name: receiver.name,
            company_name: receiver.company,
            street: receiver.street,
            city: receiver.city,
            post_code: receiver.postalCode,
            country_code: receiver.country,
            phone: receiver.phone,
            email: receiver.email
          },
          sender: {
            name: sender.name,
            company_name: sender.company,
            street: sender.street,
            city: sender.city,
            post_code: sender.postalCode,
            country_code: sender.country,
            phone: sender.phone,
            email: sender.email
          },
          parcels: [{
            dimensions: {
              length: parcelSize === 'A' ? 38 : parcelSize === 'B' ? 38 : 64,
              width: parcelSize === 'A' ? 64 : parcelSize === 'B' ? 64 : 38,
              height: parcelSize === 'A' ? 8 : parcelSize === 'B' ? 19 : 39,
              unit: 'cm'
            },
            weight: {
              amount: parcelSize === 'A' ? 5 : parcelSize === 'B' ? 10 : 15,
              unit: 'kg'
            }
          }],
          service: 'inpost_locker_standard',
          reference: `PRINTPILOT-${Date.now()}`
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      )

      const shipment = response.data
      
      // Generate label
      const labelResponse = await axios.post(
        `${this.apiUrl}/shipments/${shipment.id}/label`,
        { format: 'pdf' },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      )

      return {
        trackingNumber: shipment.tracking_number,
        labelUrl: labelResponse.data.label_url,
        provider: 'InPost',
        cost: shipment.calculated_charge_amount
      }
    } catch (error) {
      console.error('InPost API error:', error)
      throw error
    }
  }

  async getRates(sender: Address, receiver: Address): Promise<ShippingRate[]> {
    // InPost has fixed rates based on parcel size
    return [
      {
        provider: 'InPost',
        service: 'Paczkomat - rozmiar A',
        cost: 13.99,
        estimatedDays: 1
      },
      {
        provider: 'InPost',
        service: 'Paczkomat - rozmiar B',
        cost: 15.99,
        estimatedDays: 1
      },
      {
        provider: 'InPost',
        service: 'Paczkomat - rozmiar C',
        cost: 19.99,
        estimatedDays: 1
      }
    ]
  }
}

// Paczka w Ruchu API Client
export class PaczkaWRuchuClient {
  private apiKey: string
  private apiUrl: string

  constructor(apiKey: string, sandbox: boolean = false) {
    this.apiKey = apiKey
    this.apiUrl = sandbox
      ? 'https://test-api.paczka-w-ruchu.pl/v1'
      : 'https://api.paczka-w-ruchu.pl/v1'
  }

  async createShipment(sender: Address, receiver: Address, packageType: string): Promise<ShippingLabel> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/packs`,
        {
          pack_type: packageType, // 'half', 'quarter', 'eighth'
          sender: {
            name: sender.name,
            street: sender.street,
            city: sender.city,
            postcode: sender.postalCode,
            phone: sender.phone,
            email: sender.email
          },
          receiver: {
            name: receiver.name,
            street: receiver.street,
            city: receiver.city,
            postcode: receiver.postalCode,
            phone: receiver.phone,
            email: receiver.email
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      )

      return {
        trackingNumber: response.data.pack_number,
        labelUrl: response.data.label_url,
        provider: 'Paczka w Ruchu',
        cost: response.data.price
      }
    } catch (error) {
      console.error('Paczka w Ruchu API error:', error)
      throw error
    }
  }

  async getRates(sender: Address, receiver: Address): Promise<ShippingRate[]> {
    return [
      {
        provider: 'Paczka w Ruchu',
        service: 'Paczka 1/8 (do 1kg)',
        cost: 8.99,
        estimatedDays: 2
      },
      {
        provider: 'Paczka w Ruchu',
        service: 'Paczka 1/4 (do 5kg)',
        cost: 11.99,
        estimatedDays: 2
      },
      {
        provider: 'Paczka w Ruchu',
        service: 'Paczka 1/2 (do 10kg)',
        cost: 14.99,
        estimatedDays: 2
      }
    ]
  }
}

// Unified Shipping Service
export class ShippingService {
  private inpostClient?: InPostClient
  private paczkaClient?: PaczkaWRuchuClient

  constructor() {
    if (process.env.INPOST_API_KEY) {
      this.inpostClient = new InPostClient(
        process.env.INPOST_API_KEY,
        process.env.NODE_ENV !== 'production'
      )
    }
    
    if (process.env.PACZKA_API_KEY) {
      this.paczkaClient = new PaczkaWRuchuClient(
        process.env.PACZKA_API_KEY,
        process.env.NODE_ENV !== 'production'
      )
    }
  }

  async getRates(sender: Address, receiver: Address): Promise<ShippingRate[]> {
    const rates: ShippingRate[] = []

    if (this.inpostClient) {
      try {
        const inpostRates = await this.inpostClient.getRates(sender, receiver)
        rates.push(...inpostRates)
      } catch (error) {
        console.error('Failed to get InPost rates:', error)
      }
    }

    if (this.paczkaClient) {
      try {
        const paczkaRates = await this.paczkaClient.getRates(sender, receiver)
        rates.push(...paczkaRates)
      } catch (error) {
        console.error('Failed to get Paczka w Ruchu rates:', error)
      }
    }

    return rates
  }

  async createShipment(
    provider: string,
    service: string,
    sender: Address,
    receiver: Address
  ): Promise<ShippingLabel> {
    switch (provider) {
      case 'InPost':
        if (!this.inpostClient) throw new Error('InPost not configured')
        const size = service.includes('A') ? 'A' : service.includes('B') ? 'B' : 'C'
        return this.inpostClient.createShipment(sender, receiver, size)
      
      case 'Paczka w Ruchu':
        if (!this.paczkaClient) throw new Error('Paczka w Ruchu not configured')
        const type = service.includes('1/8') ? 'eighth' : service.includes('1/4') ? 'quarter' : 'half'
        return this.paczkaClient.createShipment(sender, receiver, type)
      
      default:
        throw new Error(`Unknown shipping provider: ${provider}`)
    }
  }
}

// Singleton instance
let shippingService: ShippingService | null = null

export function getShippingService(): ShippingService {
  if (!shippingService) {
    shippingService = new ShippingService()
  }
  return shippingService
}