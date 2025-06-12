'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

interface ShippingOrder {
  id: string
  externalId: string
  customerName: string
  shippingAddress: any
  status: string
  trackingNumber?: string
  shippingProvider?: string
  items: number
}

interface ShippingService {
  id: string
  name: string
  price: {
    net: number
    gross: number
    currency: string
  }
  currency?: string
  deliveryTime: string
  provider?: string
  supplier?: string
}

export default function ShippingPage() {
  const [orders, setOrders] = useState<ShippingOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProvider, setSelectedProvider] = useState('inpost')
  const [showShippingModal, setShowShippingModal] = useState(false)
  const [shippingServices, setShippingServices] = useState<ShippingService[]>([])
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)

  useEffect(() => {
    fetchShippingOrders()
  }, [])

  const fetchShippingOrders = async () => {
    try {
      const response = await fetch('/api/orders?status=PRINTED&limit=50')
      const data = await response.json()
      
      const shippingOrders = data.orders?.map((order: any) => ({
        id: order.id,
        externalId: order.externalId,
        customerName: order.customerName,
        shippingAddress: JSON.parse(order.shippingAddress),
        status: order.status,
        trackingNumber: order.trackingNumber,
        shippingProvider: order.shippingProvider,
        items: order.items?.length || 0
      }))
      
      setOrders(shippingOrders || [])
    } catch (error) {
      console.error('Error fetching shipping orders:', error)
      toast.error('Nie udało się pobrać zamówień wysyłkowych')
    } finally {
      setLoading(false)
    }
  }

  const generateShippingLabel = async (orderId: string) => {
    try {
      toast.loading('Tworzenie przesyłki z Apaczka.pl...', { id: orderId })
      
      const response = await fetch('/api/shipping/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          orderId,
          serviceId: null // Will auto-select cheapest
        })
      })
      
      const result = await response.json()
      
      if (response.ok) {
        toast.success(`Przesyłka utworzona! Śledzenie: ${result.trackingNumber}`, { id: orderId })
        fetchShippingOrders()
      } else {
        toast.error(result.error || 'Nie udało się utworzyć przesyłki', { id: orderId })
      }
    } catch (error) {
      console.error('Shipping error:', error)
      toast.error('Nie udało się utworzyć przesyłki', { id: orderId })
    }
  }

  const getShippingOptions = async (orderId: string) => {
    try {
      const order = orders.find(o => o.id === orderId)
      if (!order) return

      toast.loading('Pobieranie opcji wysyłki...', { id: `options-${orderId}` })
      
      const parcel = {
        weight: 1, // Calculate based on items
        width: 30,
        height: 20,
        depth: 5
      }
      
      const response = await fetch('/api/shipping/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toPostalCode: order.shippingAddress.postcode,
          parcel
        })
      })
      
      const result = await response.json()
      
      if (response.ok) {
        toast.success(`Znaleziono ${result.services.length} opcji wysyłki`, { id: `options-${orderId}` })
        setShippingServices(result.services)
        setSelectedOrderId(orderId)
        setShowShippingModal(true)
      } else {
        toast.error('Nie udało się pobrać opcji wysyłki', { id: `options-${orderId}` })
      }
    } catch (error) {
      toast.error('Failed to fetch shipping options', { id: `options-${orderId}` })
    }
  }

  const createShippingWithService = async (serviceId: string) => {
    if (!selectedOrderId) return
    
    try {
      toast.loading('Tworzenie przesyłki...', { id: selectedOrderId })
      
      const response = await fetch('/api/shipping/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          orderId: selectedOrderId,
          serviceId
        })
      })
      
      const result = await response.json()
      
      if (response.ok) {
        toast.success(`Przesyłka utworzona! Śledzenie: ${result.trackingNumber}`, { id: selectedOrderId })
        setShowShippingModal(false)
        setSelectedOrderId(null)
        fetchShippingOrders()
      } else {
        toast.error(result.error || 'Nie udało się utworzyć przesyłki', { id: selectedOrderId })
      }
    } catch (error) {
      console.error('Shipping error:', error)
      toast.error('Nie udało się utworzyć przesyłki', { id: selectedOrderId })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Zarządzanie wysyłką</h1>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-medium text-yellow-900 mb-2">Gotowe do wysłania</h3>
              <p className="text-sm text-yellow-700">
                {orders.length} zamówień zostało wydrukowanych i jest gotowych do etykiet wysyłkowych
              </p>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Domyślny dostawca wysyłki</label>
          <select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="inpost">InPost</option>
            <option value="poczta">Poczta Polska</option>
            <option value="dhl">DHL</option>
            <option value="dpd">DPD</option>
          </select>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Zamówienie
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Klient
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Adres
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pozycje
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Śledzenie
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Akcje
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.map((order) => (
              <tr key={order.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  #{order.externalId}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{order.customerName}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">
                    {order.shippingAddress.firstName} {order.shippingAddress.lastName}<br/>
                    {order.shippingAddress.address1}<br/>
                    {order.shippingAddress.city}, {order.shippingAddress.postcode}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {order.items} pozycji
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {order.trackingNumber ? (
                    <div>
                      <p className="text-sm font-medium text-gray-900">{order.trackingNumber}</p>
                      <p className="text-xs text-gray-500">{order.shippingProvider}</p>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500">Nie wysłane</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {!order.trackingNumber ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => getShippingOptions(order.id)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                      >
                        Sprawdź opcje
                      </button>
                      <button
                        onClick={() => generateShippingLabel(order.id)}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors"
                      >
                        Utwórz przesyłkę
                      </button>
                    </div>
                  ) : (
                    <span className="text-green-600 font-medium">✓ Wysłane</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {orders.length === 0 && (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Brak zamówień gotowych do wysłania</h3>
          <p className="mt-1 text-sm text-gray-500">Zamówienia pojawią się tutaj po wydrukowaniu.</p>
        </div>
      )}

      {/* Shipping Services Modal */}
      {showShippingModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Wybierz opcję wysyłki
                </h3>
                <button
                  onClick={() => {
                    setShowShippingModal(false)
                    setSelectedOrderId(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Courier Services */}
                <div>
                  <h4 className="text-md font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-200">
                    📦 Dostawa kurierska
                  </h4>
                  <div className="space-y-3">
                    {shippingServices
                      .filter(service => 
                        (service.name || '').toLowerCase().includes('kurier') || 
                        (service.name || '').toLowerCase().includes('door') ||
                        (service.name || '').toLowerCase().includes('drzwi')
                      )
                      .map((service) => (
                        <div
                          key={service.id}
                          className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer"
                          onClick={() => createShippingWithService(service.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-gray-900">{service.name || 'Unknown Service'}</h4>
                              <p className="text-sm text-gray-600">{service.provider || service.supplier}</p>
                              <p className="text-sm text-gray-500">Czas dostawy: {service.deliveryTime}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-semibold text-gray-900">
                                {service.price.gross.toFixed(2)} {service.price.currency}
                              </p>
                              <button className="mt-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors">
                                Wybierz
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Pickup Point Services */}
                <div>
                  <h4 className="text-md font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-200">
                    🏪 Odbiór w punkcie
                  </h4>
                  <div className="space-y-3">
                    {shippingServices
                      .filter(service => 
                        (service.name || '').toLowerCase().includes('paczkomat') ||
                        (service.name || '').toLowerCase().includes('pickup') ||
                        (service.name || '').toLowerCase().includes('punkt') ||
                        (service.name || '').toLowerCase().includes('paczka')
                      )
                      .map((service) => (
                        <div
                          key={service.id}
                          className="border border-gray-200 rounded-lg p-4 hover:border-green-300 hover:bg-green-50 transition-colors cursor-pointer"
                          onClick={() => createShippingWithService(service.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-gray-900">{service.name || 'Unknown Service'}</h4>
                              <p className="text-sm text-gray-600">{service.provider || service.supplier}</p>
                              <p className="text-sm text-gray-500">Czas dostawy: {service.deliveryTime}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-semibold text-gray-900">
                                {service.price.gross.toFixed(2)} {service.price.currency}
                              </p>
                              <button className="mt-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors">
                                Wybierz
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
              
              {shippingServices.length === 0 && (
                <p className="text-center text-gray-500 py-4">
                  Brak dostępnych opcji wysyłki dla tego zamówienia
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}