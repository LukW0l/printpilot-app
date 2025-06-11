'use client'

import { useState } from 'react'
import { formStyles } from '@/styles/colors'

interface ShippingService {
  provider: string
  serviceName: string
  price: number
  currency: string
  deliveryTime: string
  serviceId: string
}

export default function ShippingCalculatorPage() {
  const [formData, setFormData] = useState({
    weight: '',
    width: '',
    height: '',
    depth: '',
    fromPostalCode: '00-001',
    toPostalCode: '',
    insuranceValue: ''
  })
  
  const [services, setServices] = useState<ShippingService[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setServices([])

    try {
      const response = await fetch('/api/shipping/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          weight: parseFloat(formData.weight),
          width: parseFloat(formData.width),
          height: parseFloat(formData.height),
          depth: parseFloat(formData.depth),
          fromPostalCode: formData.fromPostalCode,
          toPostalCode: formData.toPostalCode,
          insuranceValue: formData.insuranceValue ? parseFloat(formData.insuranceValue) : 0
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Błąd podczas sprawdzania cen')
      }

      setServices(result.services || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Kalkulator Cen Wysyłki
        </h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Wymiary paczki */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Wymiary paczki</h3>
              
              <div>
                <label className={formStyles.label}>
                  Waga (kg) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  required
                  className={formStyles.input}
                  value={formData.weight}
                  onChange={(e) => handleInputChange('weight', e.target.value)}
                  placeholder="np. 2.5"
                />
              </div>

              <div>
                <label className={formStyles.label}>
                  Szerokość (cm) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  required
                  className={formStyles.input}
                  value={formData.width}
                  onChange={(e) => handleInputChange('width', e.target.value)}
                  placeholder="np. 30"
                />
              </div>

              <div>
                <label className={formStyles.label}>
                  Wysokość (cm) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  required
                  className={formStyles.input}
                  value={formData.height}
                  onChange={(e) => handleInputChange('height', e.target.value)}
                  placeholder="np. 20"
                />
              </div>

              <div>
                <label className={formStyles.label}>
                  Głębokość (cm) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  required
                  className={formStyles.input}
                  value={formData.depth}
                  onChange={(e) => handleInputChange('depth', e.target.value)}
                  placeholder="np. 10"
                />
              </div>

              <div>
                <label className={formStyles.label}>
                  Wartość ubezpieczenia (zł)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className={formStyles.input}
                  value={formData.insuranceValue}
                  onChange={(e) => handleInputChange('insuranceValue', e.target.value)}
                  placeholder="np. 500"
                />
              </div>
            </div>

            {/* Adresy */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Adresy</h3>
              
              <div>
                <label className={formStyles.label}>
                  Kod pocztowy nadawcy
                </label>
                <input
                  type="text"
                  pattern="[0-9]{2}-[0-9]{3}"
                  className={formStyles.input}
                  value={formData.fromPostalCode}
                  onChange={(e) => handleInputChange('fromPostalCode', e.target.value)}
                  placeholder="00-001"
                />
              </div>

              <div>
                <label className={formStyles.label}>
                  Kod pocztowy odbiorcy *
                </label>
                <input
                  type="text"
                  pattern="[0-9]{2}-[0-9]{3}"
                  required
                  className={formStyles.input}
                  value={formData.toPostalCode}
                  onChange={(e) => handleInputChange('toPostalCode', e.target.value)}
                  placeholder="np. 30-001"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sprawdzam ceny...' : 'Sprawdź ceny wysyłki'}
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {services.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Dostępne usługi wysyłki
            </h2>
            
            <div className="grid gap-4">
              {services.map((service, index) => (
                <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {service.provider} - {service.serviceName}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Czas dostawy: {service.deliveryTime}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        ID usługi: {service.serviceId}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-green-600">
                        {service.price.toFixed(2)} {service.currency}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {services.length > 1 && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800 font-medium">
                  💡 Najtańsza opcja: {
                    services.reduce((cheapest, current) => 
                      current.price < cheapest.price ? current : cheapest
                    ).provider
                  } - {
                    services.reduce((cheapest, current) => 
                      current.price < cheapest.price ? current : cheapest
                    ).serviceName
                  } ({
                    services.reduce((cheapest, current) => 
                      current.price < cheapest.price ? current : cheapest
                    ).price.toFixed(2)
                  } {
                    services.reduce((cheapest, current) => 
                      current.price < cheapest.price ? current : cheapest
                    ).currency
                  })
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}