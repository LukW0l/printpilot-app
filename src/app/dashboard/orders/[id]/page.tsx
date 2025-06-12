'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { theme, getTextClass } from '@/styles/theme'
import { formStyles } from '@/styles/form-styles'
import toast from 'react-hot-toast'

interface Order {
  id: string
  externalId: string
  customerName: string
  customerEmail: string
  customerPhone: string
  status: string
  paymentStatus: string
  paymentMethod?: string
  paidAt?: string
  shippingCost?: number
  totalAmount: number
  currency: string
  orderDate: string
  trackingNumber: string
  shippingProvider: string
  shippingAddress: any
  billingAddress: any
  deliveryNotes?: string
  shop?: {
    name: string
    platform: string
  }
  items?: {
    id: string
    name: string
    quantity: number
    price: number
    sku: string
    imageUrl: string
    productType: string
    dimensions: string
    productionCost?: {
      totalMaterialCost: number
      wholesalePrice: number
      finalPrice: number
      profit: number
    }
  }[]
}

const STATUS_WORKFLOW = {
  NEW: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['PRINTED', 'CANCELLED'],
  PRINTED: ['PACKAGED', 'SHIPPED', 'CANCELLED'],
  PACKAGED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: []
}

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [calculatingCost, setCalculatingCost] = useState<string | null>(null)
  const [showShippingModal, setShowShippingModal] = useState(false)
  const [creatingShipment, setCreatingShipment] = useState(false)
  const [shippingServices, setShippingServices] = useState<any[]>([])
  const [loadingServices, setLoadingServices] = useState(false)
  const [refreshingData, setRefreshingData] = useState(false)
  const [customDimensions, setCustomDimensions] = useState({ width: 0, height: 0, depth: 0, weight: 0 })
  const [useCustomDimensions, setUseCustomDimensions] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(false)

  useEffect(() => {
    fetchOrder()
  }, [params.id])

  const fetchOrder = async (refresh = false) => {
    try {
      const url = refresh ? `/api/orders/${params.id}?refresh=true` : `/api/orders/${params.id}?t=${Date.now()}`
      const response = await fetch(url, {
        cache: 'no-store'
      })
      const data = await response.json()
      
      // Parse JSON addresses
      if (data.shippingAddress && typeof data.shippingAddress === 'string') {
        data.shippingAddress = JSON.parse(data.shippingAddress)
      }
      if (data.billingAddress && typeof data.billingAddress === 'string') {
        data.billingAddress = JSON.parse(data.billingAddress)
      }
      
      setOrder(data)
      
      if (refresh) {
        toast.success('Dane zamówienia zostały odświeżone z WooCommerce!')
      }
    } catch (error) {
      console.error('Error fetching order:', error)
      if (refresh) {
        toast.error('Nie udało się odświeżyć danych z WooCommerce')
      }
    } finally {
      setLoading(false)
      setRefreshingData(false)
    }
  }

  const refreshOrderData = async () => {
    setRefreshingData(true)
    await fetchOrder(true)
  }

  const updateOrderStatus = async (newStatus: string) => {
    if (!order) return
    
    setUpdating(true)
    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      
      if (response.ok) {
        const updatedOrder = await response.json()
        setOrder(updatedOrder)
      }
    } catch (error) {
      console.error('Error updating order:', error)
    } finally {
      setUpdating(false)
    }
  }

  const updateShipping = async (trackingNumber: string, shippingProvider: string) => {
    if (!order) return
    
    setUpdating(true)
    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackingNumber, shippingProvider })
      })
      
      if (response.ok) {
        const updatedOrder = await response.json()
        setOrder(updatedOrder)
      }
    } catch (error) {
      console.error('Error updating shipping:', error)
    } finally {
      setUpdating(false)
    }
  }

  const calculateItemCost = async (itemId: string, dimensions: string) => {
    setCalculatingCost(itemId)
    try {
      const response = await fetch('/api/production-costs/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dimensions })
      })
      
      if (response.ok) {
        const costResult = await response.json()
        
        // Save the cost to the database
        await fetch(`/api/order-items/${itemId}/production-cost`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(costResult)
        })
        
        // Refresh the order to show updated costs
        await fetchOrder()
      }
    } catch (error) {
      console.error('Error calculating production cost:', error)
    } finally {
      setCalculatingCost(null)
    }
  }

  const fetchShippingServices = async () => {
    if (!order) return
    
    setLoadingServices(true)
    try {
      const response = await fetch('/api/shipping/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id })
      })
      
      const result = await response.json()
      
      if (response.ok) {
        setShippingServices(result.services || result.services || [])
      } else {
        console.error('Failed to fetch shipping services:', result.error)
        // Use fallback services
        setShippingServices([
          {
            id: '21',
            name: 'InPost Paczkomaty',
            price: { gross: 14.76, currency: 'PLN' },
            icon: '📦',
            description: 'Dostawa do paczkomatu InPost',
            deliveryDays: '1-2 dni robocze',
            recommended: true
          },
          {
            id: '41',
            name: 'Kurier standardowy',
            price: { gross: 19.68, currency: 'PLN' },
            icon: '🚚',
            description: 'Kurier standardowy do drzwi',
            deliveryDays: '1-3 dni robocze',
            recommended: false
          }
        ])
      }
    } catch (error) {
      console.error('Error fetching shipping services:', error)
      setShippingServices([])
    } finally {
      setLoadingServices(false)
    }
  }

  const handleCreateShipment = async (serviceId?: string) => {
    if (!order) return
    
    setCreatingShipment(true)
    try {
      toast.loading('Tworzenie przesyłki...', { id: 'shipment' })
      
      // Prepare custom dimensions if they are being used
      const shipmentData: any = { 
        orderId: order.id,
        serviceId: serviceId || null // null = auto-select cheapest
      }
      
      // Add custom dimensions if user is using them
      if (useCustomDimensions && customDimensions.width > 0) {
        shipmentData.customDimensions = {
          width: customDimensions.width,
          height: customDimensions.height,
          depth: customDimensions.depth,
          weight: customDimensions.weight
        }
      }
      
      const response = await fetch('/api/shipping/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shipmentData)
      })
      
      const result = await response.json()
      
      if (response.ok) {
        toast.success(`Przesyłka utworzona! Numer: ${result.trackingNumber}`, { id: 'shipment' })
        setShowShippingModal(false)
        setUseCustomDimensions(false) // Reset custom dimensions
        await fetchOrder() // Refresh to show tracking info
      } else {
        if (result.error && result.error.includes('already has an active shipment')) {
          toast.error('To zamówienie ma już aktywną przesyłkę. Usuń ją najpierw używając przycisku "Usuń przesyłkę" poniżej.', { id: 'shipment' })
        } else {
          toast.error(result.error || 'Nie udało się utworzyć przesyłki', { id: 'shipment' })
        }
      }
    } catch (error) {
      console.error('Error creating shipment:', error)
      toast.error('Błąd podczas tworzenia przesyłki', { id: 'shipment' })
    } finally {
      setCreatingShipment(false)
    }
  }

  const openShippingModal = () => {
    setShowShippingModal(true)
    fetchShippingServices()
  }

  const downloadShippingLabel = async () => {
    if (!order?.trackingNumber || order.trackingNumber === 'PENDING') return
    
    try {
      toast.loading('Pobieranie etykiety...', { id: 'label' })
      
      const response = await fetch(`/api/shipping/labels/${order.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: 'pdf' })
      })
      
      const result = await response.json()
      
      if (response.ok) {
        if (result.labelUrl) {
          // Open label URL in new tab
          window.open(result.labelUrl, '_blank')
          toast.success('Etykieta pobrana!', { id: 'label' })
        } else if (result.isBase64 && result.labelData) {
          // Handle base64 data
          const binaryString = atob(result.labelData)
          const bytes = new Uint8Array(binaryString.length)
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i)
          }
          
          const blob = new Blob([bytes], { type: 'application/pdf' })
          const url = URL.createObjectURL(blob)
          
          const a = document.createElement('a')
          a.href = url
          a.download = `shipping-label-${result.trackingNumber}.pdf`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
          
          toast.success('Etykieta pobrana!', { id: 'label' })
        } else {
          toast.error('Nie udało się pobrać etykiety', { id: 'label' })
        }
      } else {
        toast.error(result.error || 'Nie udało się pobrać etykiety', { id: 'label' })
      }
    } catch (error) {
      console.error('Error downloading label:', error)
      toast.error('Błąd podczas pobierania etykiety', { id: 'label' })
    }
  }

  const deleteShipment = async () => {
    if (!order || !confirm('Czy na pewno chcesz usunąć dane przesyłki? Będzie można utworzyć nową przesyłkę z nowymi parametrami.')) return
    
    try {
      toast.loading('Usuwanie przesyłki...', { id: 'delete-shipment' })
      
      // Call API to delete shipment completely
      const response = await fetch(`/api/shipping/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id })
      })
      
      const result = await response.json()
      
      if (response.ok) {
        toast.success('Dane przesyłki zostały usunięte. Możesz teraz utworzyć nową przesyłkę.', { id: 'delete-shipment' })
        await fetchOrder() // Refresh to show updated state
      } else {
        toast.error(result.error || 'Nie udało się usunąć danych przesyłki', { id: 'delete-shipment' })
      }
    } catch (error) {
      console.error('Error deleting shipment:', error)
      toast.error('Błąd podczas usuwania przesyłki', { id: 'delete-shipment' })
    }
  }

  const checkShipmentStatus = async () => {
    if (!order?.trackingNumber) return
    
    setCheckingStatus(true)
    try {
      toast.loading('Sprawdzanie statusu przesyłki...', { id: 'check-status' })
      
      const response = await fetch('/api/shipping/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          orderId: order.id, 
          trackingNumber: order.trackingNumber 
        })
      })
      
      const result = await response.json()
      
      if (response.ok) {
        if (result.statusChanged) {
          toast.success(`Status zaktualizowany: ${result.previousStatus} → ${result.newStatus}`, { id: 'check-status' })
          await fetchOrder() // Refresh to show updated status
        } else {
          toast.success('Status przesyłki sprawdzony - bez zmian', { id: 'check-status' })
        }
      } else {
        toast.error(result.error || 'Nie udało się sprawdzić statusu', { id: 'check-status' })
      }
    } catch (error) {
      console.error('Error checking shipment status:', error)
      toast.error('Błąd podczas sprawdzania statusu', { id: 'check-status' })
    } finally {
      setCheckingStatus(false)
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      NEW: 'bg-blue-100 text-blue-800',
      PROCESSING: 'bg-yellow-100 text-yellow-800',
      PRINTED: 'bg-purple-100 text-purple-800',
      PACKAGED: 'bg-orange-100 text-orange-800',
      SHIPPED: 'bg-green-100 text-green-800',
      DELIVERED: 'bg-gray-100 text-gray-800',
      CANCELLED: 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900">Zamówienie nie zostało znalezione</h3>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 text-blue-600 hover:text-blue-800"
          >
            Powrót do panelu
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-3 sm:py-4 gap-3">
            <div className="flex items-center flex-wrap gap-2 sm:gap-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Zamówienie #{order.externalId}</h1>
              <span className={`inline-flex items-center px-2 sm:px-3 py-0.5 rounded-full text-xs sm:text-sm font-medium ${getStatusColor(order.status)}`}>
                {order.status}
              </span>
            </div>
            {order.shop?.platform === 'woocommerce' && (
              <button
                onClick={refreshOrderData}
                disabled={refreshingData}
                className="inline-flex items-center justify-center px-3 py-1.5 text-xs sm:text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                title="Odśwież dane z WooCommerce"
              >
                <svg className={`w-4 h-4 mr-1 ${refreshingData ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {refreshingData ? 'Odświeżanie...' : 'Odśwież dane'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Customer Info */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">Informacje o kliencie</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <p className={`text-xs sm:text-sm font-medium ${getTextClass('secondary')}`}>Imię i nazwisko</p>
                  <p className={`text-xs sm:text-sm ${getTextClass('primary')}`}>{order.customerName}</p>
                </div>
                <div>
                  <p className={`text-xs sm:text-sm font-medium ${getTextClass('secondary')}`}>Email</p>
                  <p className={`text-xs sm:text-sm ${getTextClass('primary')} break-all`}>{order.customerEmail || 'Brak'}</p>
                </div>
                <div>
                  <p className={`text-xs sm:text-sm font-medium ${getTextClass('secondary')}`}>Telefon</p>
                  <p className={`text-xs sm:text-sm ${getTextClass('primary')}`}>{order.customerPhone || 'Brak'}</p>
                </div>
                <div>
                  <p className={`text-xs sm:text-sm font-medium ${getTextClass('secondary')}`}>Sklep</p>
                  <p className={`text-xs sm:text-sm ${getTextClass('primary')}`}>{order.shop?.name || 'Unknown'} ({order.shop?.platform || 'unknown'})</p>
                </div>
              </div>
            </div>

            {/* Customer Notes */}
            {order.deliveryNotes && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
                <h2 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">Notatka od klienta</h2>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex">
                    <svg className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p className={`text-sm ${getTextClass('primary')}`}>{order.deliveryNotes}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">Informacje o płatności</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <p className={`text-xs sm:text-sm font-medium ${getTextClass('secondary')}`}>Status płatności</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border mt-1 ${
                    order.paymentStatus === 'PAID' ? 'bg-green-100 text-green-800 border-green-200' :
                    order.paymentStatus === 'COD' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                    order.paymentStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                    order.paymentStatus === 'FAILED' ? 'bg-red-100 text-red-800 border-red-200' :
                    order.paymentStatus === 'REFUNDED' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                    'bg-gray-100 text-gray-800 border-gray-200'
                  }`}>
                    {order.paymentStatus === 'PAID' ? 'Opłacone' :
                     order.paymentStatus === 'COD' ? 'Za pobraniem' :
                     order.paymentStatus === 'PENDING' ? 'Oczekuje płatności' :
                     order.paymentStatus === 'FAILED' ? 'Nieudana płatność' :
                     order.paymentStatus === 'REFUNDED' ? 'Zwrócone' :
                     order.paymentStatus || 'Nieznany'}
                  </span>
                </div>
                <div>
                  <p className={`text-sm font-medium ${getTextClass('secondary')}`}>Metoda płatności</p>
                  <p className={`text-sm ${getTextClass('primary')}`}>
                    {order.paymentMethod || 'Brak informacji'}
                  </p>
                </div>
                <div>
                  <p className={`text-sm font-medium ${getTextClass('secondary')}`}>Data płatności</p>
                  <p className={`text-sm ${getTextClass('primary')}`}>
                    {order.paymentStatus === 'COD' ? 'Płatność przy odbiorze' :
                     order.paidAt ? new Date(order.paidAt).toLocaleString('pl-PL') : 'Nie opłacone'}
                  </p>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Pozycje zamówienia</h2>
              <div className="space-y-4">
                {order.items?.map((item) => (
                  <div key={item.id} className="flex items-start space-x-4 p-4 bg-white border border-gray-100 rounded-lg">
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.name || 'Product Image'}
                        className="w-20 h-20 object-cover rounded-md"
                      />
                    )}
                    <div className="flex-1">
                      <h4 className={`text-sm font-medium ${getTextClass('primary')}`}>{item.name || 'Unknown Item'}</h4>
                      <p className={`text-sm ${getTextClass('secondary')}`}>SKU: {item.sku || 'Brak'}</p>
                      <p className={`text-sm ${getTextClass('secondary')}`}>Typ: {item.productType}</p>
                      {item.dimensions && (
                        <p className={`text-sm ${getTextClass('secondary')}`}>Rozmiar: {item.dimensions}</p>
                      )}
                      {item.productionCost && (
                        <div className="mt-2 p-2 bg-white border border-blue-200 rounded text-xs">
                          <p><span className="font-medium">Koszt materiałów:</span> {Number(item.productionCost.totalMaterialCost).toFixed(2)} PLN</p>
                          <p><span className="font-medium">Koszt produkcji:</span> {Number(item.productionCost.wholesalePrice).toFixed(2)} PLN</p>
                          <p><span className="font-medium">Cena końcowa:</span> {Number(item.productionCost.finalPrice).toFixed(2)} PLN</p>
                          <p className="text-green-600"><span className="font-medium">Zysk:</span> {Number(item.productionCost.profit).toFixed(2)} PLN</p>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${getTextClass('primary')}`}>
                        {Number(item.price).toFixed(2)} {order.currency}
                      </p>
                      <p className={`text-sm ${getTextClass('secondary')}`}>Ilość: {item.quantity}</p>
                      {!item.productionCost && item.dimensions && (
                        <button
                          onClick={() => calculateItemCost(item.id, item.dimensions)}
                          disabled={calculatingCost === item.id}
                          className="mt-1 text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          {calculatingCost === item.id ? 'Obliczanie...' : 'Oblicz koszt'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                {/* Price breakdown */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <p className="text-gray-600">Wartość produktów</p>
                    <p className="text-gray-900">
                      {order.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2) || '0.00'} {order.currency}
                    </p>
                  </div>
                  {order.shippingCost !== undefined && order.shippingCost !== null && (
                    <div className="flex justify-between text-sm">
                      <p className="text-gray-600">Koszt wysyłki</p>
                      <p className="text-gray-900">
                        {Number(order.shippingCost).toFixed(2)} {order.currency}
                      </p>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-medium pt-2 border-t border-gray-100">
                    <p className="text-gray-900">Suma</p>
                    <p className="text-gray-900">
                      {Number(order.totalAmount).toFixed(2)} {order.currency}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Addresses */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Adresy</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className={`text-sm font-medium ${getTextClass('primary')} mb-2`}>Adres dostawy</h3>
                  <div className={`text-sm ${getTextClass('secondary')}`}>
                    <p>{order.shippingAddress.firstName} {order.shippingAddress.lastName}</p>
                    <p>{order.shippingAddress.address1}</p>
                    {order.shippingAddress.address2 && <p>{order.shippingAddress.address2}</p>}
                    <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postcode}</p>
                    <p>{order.shippingAddress.country}</p>
                  </div>
                </div>
                <div>
                  <h3 className={`text-sm font-medium ${getTextClass('primary')} mb-2`}>Adres rozliczeniowy</h3>
                  <div className={`text-sm ${getTextClass('secondary')}`}>
                    <p>{order.billingAddress.firstName} {order.billingAddress.lastName}</p>
                    <p>{order.billingAddress.address1}</p>
                    {order.billingAddress.address2 && <p>{order.billingAddress.address2}</p>}
                    <p>{order.billingAddress.city}, {order.billingAddress.state} {order.billingAddress.postcode}</p>
                    <p>{order.billingAddress.country}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Akcje zamówienia</h3>
              <div className="space-y-3">
                {/* Manual Status Selection */}
                <div>
                  <label className={`block text-sm font-medium ${getTextClass('secondary')} mb-2`}>
                    Ustaw status ręcznie
                  </label>
                  <select
                    value={order.status}
                    onChange={(e) => updateOrderStatus(e.target.value)}
                    disabled={updating}
                    className={`${formStyles.select} w-full`}
                  >
                    <option value="NEW">NEW - Nowe</option>
                    <option value="PROCESSING">PROCESSING - W realizacji</option>
                    <option value="PRINTED">PRINTED - Wydrukowane</option>
                    <option value="PACKAGED">PACKAGED - Spakowane</option>
                    <option value="SHIPPED">SHIPPED - Wysłane</option>
                    <option value="DELIVERED">DELIVERED - Dostarczone</option>
                    <option value="CANCELLED">CANCELLED - Anulowane</option>
                  </select>
                </div>

                {/* Quick Status Buttons */}
                <div className="border-t border-gray-200 pt-3">
                  <h4 className={`text-sm font-medium ${getTextClass('secondary')} mb-2`}>Szybkie akcje</h4>
                  {STATUS_WORKFLOW[order.status as keyof typeof STATUS_WORKFLOW]?.map((nextStatus) => (
                    <button
                      key={nextStatus}
                      onClick={() => updateOrderStatus(nextStatus)}
                      disabled={updating}
                      className="w-full mb-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      Oznacz jako {nextStatus}
                    </button>
                  ))}
                </div>
                
                {/* Shipping Actions */}
                {!order.trackingNumber && (order.status === 'PRINTED' || order.status === 'PACKAGED') && (
                  <>
                    <div className="border-t border-gray-200 pt-3 mt-3">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Wysyłka</h4>
                    </div>
                    <button
                      onClick={openShippingModal}
                      disabled={creatingShipment}
                      className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      Zamów kuriera
                    </button>
                    <button
                      onClick={() => handleCreateShipment()}
                      disabled={creatingShipment}
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      {creatingShipment ? 'Tworzenie...' : 'Szybkie zamówienie'}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Shipping Info */}
            <div className={formStyles.container}>
              <h3 className={formStyles.sectionTitle}>Informacje o wysyłce</h3>
              {order.trackingNumber && order.trackingNumber !== 'PENDING' ? (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <p className={`text-sm ${getTextClass('secondary')}`}>
                      <span className="font-medium">Przewoźnik:</span> {order.shippingProvider || 'Brak'}
                    </p>
                    <p className={`text-sm ${getTextClass('secondary')}`}>
                      <span className="font-medium">Numer przesyłki:</span> {order.trackingNumber?.trim()}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={downloadShippingLabel}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Pobierz etykietę
                    </button>
                    <button
                      onClick={() => window.open(`https://inpost.pl/sledzenie-przesylek?number=${order.trackingNumber?.trim()}`, '_blank')}
                      className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Śledź
                    </button>
                  </div>
                  <button
                    onClick={checkShipmentStatus}
                    disabled={checkingStatus}
                    className="w-full mt-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center"
                  >
                    <svg className={`w-4 h-4 mr-2 ${checkingStatus ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {checkingStatus ? 'Sprawdzanie...' : 'Sprawdź status w API'}
                  </button>
                  <button
                    onClick={deleteShipment}
                    className="w-full mt-2 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center"
                    title="Usuń dane przesyłki, aby móc utworzyć nową z nowymi parametrami"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Usuń przesyłkę
                  </button>
                  <p className="text-xs text-gray-500 mt-1 text-center">
                    💡 Usuń aby utworzyć nową przesyłkę z innymi parametrami
                  </p>
                </div>
              ) : order.trackingNumber === 'PENDING' ? (
                <div className="bg-white border border-yellow-300 rounded-lg p-4">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-yellow-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-yellow-800">Przesyłka w trakcie tworzenia</p>
                      <p className="text-sm text-yellow-700">Przewoźnik: {order.shippingProvider || 'Apaczka.pl'}</p>
                      <p className="text-sm text-yellow-600">Numer śledzenia zostanie przypisany wkrótce...</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={formStyles.spacing.formElements}>
                  <div>
                    <label className={formStyles.label}>
                      Numer przesyłki
                    </label>
                    <input
                      type="text"
                      placeholder="Wprowadź numer śledzenia"
                      className={formStyles.input}
                      id="tracking-number"
                    />
                  </div>
                  
                  <div>
                    <label className={formStyles.label}>
                      Przewoźnik
                    </label>
                    <select
                      className={formStyles.select}
                      id="shipping-provider"
                    >
                      <option value="">Wybierz przewoźnika</option>
                      <option value="Apaczka.pl">Apaczka.pl</option>
                      <option value="InPost">InPost</option>
                      <option value="Paczka w Ruchu">Paczka w Ruchu</option>
                      <option value="DPD">DPD</option>
                      <option value="Pocztex">Pocztex</option>
                      <option value="UPS">UPS</option>
                      <option value="FedEx">FedEx</option>
                    </select>
                  </div>
                  
                  <button
                    onClick={() => {
                      const trackingNumber = (document.getElementById('tracking-number') as HTMLInputElement).value
                      const shippingProvider = (document.getElementById('shipping-provider') as HTMLSelectElement).value
                      if (trackingNumber && shippingProvider) {
                        updateShipping(trackingNumber, shippingProvider)
                      } else {
                        alert('Proszę wypełnić wszystkie pola')
                      }
                    }}
                    disabled={updating}
                    className={formStyles.primaryButton}
                  >
                    {updating ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Zapisywanie...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Dodaj informacje o wysyłce
                      </>
                    )}
                  </button>
                  
                  <div className={formStyles.helpText}>
                    💡 Alternatywnie możesz użyć przycisku "Zamów kuriera" w sekcji akcji zamówienia
                  </div>
                </div>
              )}
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Historia zamówienia</h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                      <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className={`text-sm font-medium ${getTextClass('primary')}`}>Zamówienie złożone</p>
                    <p className={`text-sm ${getTextClass('secondary')}`}>
                      {new Date(order.orderDate).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Shipping Modal */}
      {showShippingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-lg font-medium ${getTextClass('primary')}`}>Zamów kuriera</h3>
              <button
                onClick={() => setShowShippingModal(false)}
                className={`${getTextClass('muted')} hover:${getTextClass('secondary')}`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-6">
              <h4 className={`text-sm font-medium ${getTextClass('secondary')} mb-3`}>Adres dostawy</h4>
              <div className="bg-gray-50 p-3 rounded-md text-sm">
                <p className={`font-medium ${getTextClass('primary')}`}>{order.shippingAddress.firstName} {order.shippingAddress.lastName}</p>
                <p className={getTextClass('secondary')}>{order.shippingAddress.address1}</p>
                {order.shippingAddress.address2 && <p className={getTextClass('secondary')}>{order.shippingAddress.address2}</p>}
                <p className={getTextClass('secondary')}>{order.shippingAddress.city}, {order.shippingAddress.postcode}</p>
                <p className={getTextClass('secondary')}>{order.shippingAddress.country}</p>
              </div>
              
              {/* Delivery Notes in Shipping Modal */}
              {order.deliveryNotes && (
                <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-md">
                  <div className="flex items-center mb-2">
                    <svg className="w-4 h-4 text-orange-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-1l-4 4z" />
                    </svg>
                    <span className="text-sm font-medium text-orange-800">Instrukcje dostawy od klienta:</span>
                  </div>
                  <p className="text-sm text-orange-700 font-medium">"{order.deliveryNotes}"</p>
                </div>
              )}
            </div>

            <div className="mb-6">
              <h4 className={`text-sm font-medium ${getTextClass('secondary')} mb-3`}>Zawartość przesyłki</h4>
              <div className="space-y-2">
                {order.items?.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm bg-gray-50 p-2 rounded">
                    <span className={getTextClass('primary')}>{item.name || 'Unknown Item'}</span>
                    <span className={getTextClass('secondary')}>{item.quantity}szt {item.dimensions && `• ${item.dimensions}`}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Parcel Dimensions Preview */}
            <div className="mb-6">
              <h4 className={`text-sm font-medium ${getTextClass('secondary')} mb-3`}>Wymiary paczki</h4>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <span className="text-blue-600 mr-2">📦</span>
                  <span className="font-medium text-blue-900">Obliczone wymiary:</span>
                </div>
                {(() => {
                  // Calculate dimensions using improved logic for multiple items
                  let maxWidth = 20
                  let maxHeight = 15
                  let foundDimensions = false
                  const debugInfo: any[] = []
                  let totalItems = 0
                  
                  order.items?.forEach(item => {
                    totalItems += item.quantity // Count total quantity of all items
                    
                    // Check both dimensions field and product name for dimensions
                    const dimensionSources = [
                      item.dimensions,
                      item.name || '' // Check product name as fallback
                    ].filter(Boolean)
                    
                    let matched = false
                    
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
                        
                        for (const pattern of patterns) {
                          const dimensionMatch = source.match(pattern)
                          if (dimensionMatch) {
                            const width = parseInt(dimensionMatch[1])
                            const height = parseInt(dimensionMatch[2])
                            maxWidth = Math.max(maxWidth, width)
                            maxHeight = Math.max(maxHeight, height)
                            foundDimensions = true
                            matched = true
                            debugInfo.push(`${item.name || 'Unknown Item'} (${item.quantity}szt): ${width}x${height} (znaleziono ${source === item.dimensions ? 'w wymiarach' : 'w nazwie'})`)
                            break
                          }
                        }
                        
                        if (matched) break
                      }
                    }
                    
                    if (!matched) {
                      debugInfo.push(`${item.name || 'Unknown Item'} (${item.quantity}szt): brak wymiarów`)
                    }
                  })
                  
                  // Improved calculation: depth = 4cm per item, weight multiplied by quantity
                  const depthPerItem = 4
                  const calculatedDepth = depthPerItem * totalItems
                  
                  // Weight calculation based on area and quantity
                  const area = (maxWidth * maxHeight) / 10000 // convert to m²
                  let weightPerItem = 2.0
                  if (area >= 0.96) { // 120x80 = 0.96m²
                    weightPerItem = 5.0
                  } else if (area >= 0.35) { // 70x50 = 0.35m²
                    weightPerItem = 3.0
                  } else if (area >= 0.24) { // 60x40 = 0.24m²
                    weightPerItem = 2.0
                  } else {
                    weightPerItem = Math.max(1.0, area * 8)
                  }
                  
                  const totalWeight = weightPerItem * totalItems
                  
                  // Set initial custom dimensions if not set
                  if (customDimensions.width === 0) {
                    setCustomDimensions({
                      width: maxWidth,
                      height: maxHeight,
                      depth: calculatedDepth,
                      weight: totalWeight
                    })
                  }
                  
                  const finalDimensions = useCustomDimensions ? customDimensions : {
                    width: maxWidth,
                    height: maxHeight,
                    depth: calculatedDepth,
                    weight: totalWeight
                  }
                  
                  return (
                    <div className="text-sm text-blue-800">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium">Wymiary paczki:</span>
                        <button
                          onClick={() => setUseCustomDimensions(!useCustomDimensions)}
                          className={`px-2 py-1 text-xs rounded ${useCustomDimensions ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}
                        >
                          {useCustomDimensions ? '✏️ Edytowane' : '📝 Edytuj'}
                        </button>
                      </div>
                      
                      {useCustomDimensions ? (
                        <div className="space-y-2 p-3 bg-orange-50 border border-orange-200 rounded">
                          <div className="grid grid-cols-4 gap-2">
                            <div>
                              <label className="text-xs font-medium text-gray-700">Szerokość (cm)</label>
                              <input
                                type="number"
                                min="1"
                                value={customDimensions.width}
                                onChange={(e) => setCustomDimensions(prev => ({...prev, width: parseInt(e.target.value) || 0}))}
                                className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-700">Wysokość (cm)</label>
                              <input
                                type="number"
                                min="1"
                                value={customDimensions.height}
                                onChange={(e) => setCustomDimensions(prev => ({...prev, height: parseInt(e.target.value) || 0}))}
                                className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-700">Głębokość (cm)</label>
                              <input
                                type="number"
                                min="1"
                                value={customDimensions.depth}
                                onChange={(e) => setCustomDimensions(prev => ({...prev, depth: parseInt(e.target.value) || 0}))}
                                className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-700">Waga (kg)</label>
                              <input
                                type="number"
                                min="0.1"
                                step="0.1"
                                value={customDimensions.weight}
                                onChange={(e) => setCustomDimensions(prev => ({...prev, weight: parseFloat(e.target.value) || 0}))}
                                className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                              />
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <button
                              onClick={() => {
                                setCustomDimensions({
                                  width: maxWidth,
                                  height: maxHeight,
                                  depth: calculatedDepth,
                                  weight: totalWeight
                                })
                              }}
                              className="text-xs text-blue-600 hover:text-blue-800"
                            >
                              🔄 Przywróć automatyczne
                            </button>
                            <button
                              onClick={() => setUseCustomDimensions(false)}
                              className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                            >
                              ✅ Zatwierdź
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <p><strong>Wymiary:</strong> {finalDimensions.width}×{finalDimensions.height}×{finalDimensions.depth} cm</p>
                          <p><strong>Waga bilingowa:</strong> {finalDimensions.weight} kg</p>
                        </div>
                      )}
                      
                      {!foundDimensions && (
                        <p className="text-xs text-red-600 mt-1">
                          ⚠️ Nie znaleziono wymiarów w produktach - używam domyślnych rozmiarów
                        </p>
                      )}
                      {foundDimensions && !useCustomDimensions && (
                        <p className="text-xs text-green-600 mt-1">
                          ✅ Obliczono dla {totalItems} obrazów: {maxWidth}×{maxHeight} cm + {calculatedDepth} cm głębokość (4cm × {totalItems})
                        </p>
                      )}
                      
                      <div className="text-xs text-gray-600 mt-2 bg-gray-50 p-2 rounded">
                        <p><strong>Debug - produkty:</strong></p>
                        {debugInfo.map((info, idx) => (
                          <p key={idx}>• {info}</p>
                        ))}
                        <p className="mt-1"><strong>Łącznie obrazów:</strong> {totalItems} szt.</p>
                        <p><strong>Logika:</strong> głębokość = 4cm × {totalItems} = {calculatedDepth}cm, waga = {weightPerItem}kg × {totalItems} = {totalWeight}kg</p>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>

            {/* COD Payment Info */}
            {(order.paymentStatus === 'COD' || order.paymentMethod?.toLowerCase().includes('cod') || order.paymentMethod?.toLowerCase().includes('pobraniem')) && (
              <div className="mb-6">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <span className="text-orange-600 mr-2">💰</span>
                    <span className="font-medium text-orange-900">Płatność za pobraniem (COD)</span>
                  </div>
                  <div className="text-sm text-orange-800">
                    <p><strong>Kwota do pobrania:</strong> {Number(order.totalAmount).toFixed(2)} {order.currency}</p>
                    <p><strong>Metoda płatności:</strong> {order.paymentMethod || 'Za pobraniem'}</p>
                    <p className="text-xs text-orange-600 mt-1">
                      ⚠️ Przesyłka zostanie oznaczona jako płatność za pobraniem
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <h4 className={`text-sm font-medium ${getTextClass('secondary')}`}>Wybierz usługę kurierską</h4>
              
              {loadingServices ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className={`ml-3 ${getTextClass('secondary')}`}>Pobieranie opcji wysyłki...</span>
                </div>
              ) : shippingServices.length > 0 ? (
                <>
                  {shippingServices.map((service) => (
                    <button
                      key={service.id}
                      onClick={() => handleCreateShipment(service.id)}
                      disabled={creatingShipment}
                      className={`w-full p-4 border rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left disabled:opacity-50 ${
                        service.recommended ? 'border-green-300 bg-green-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="flex items-center">
                            <span className="mr-2">{service.icon}</span>
                            <p className="font-medium text-gray-900">{service.name}</p>
                            {service.recommended && (
                              <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                Polecane
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{service.description}</p>
                          <p className="text-xs text-gray-500">{service.deliveryDays}</p>
                        </div>
                        <span className="text-green-600 font-medium">
                          {service.price.gross.toFixed(2)} {service.price.currency}
                        </span>
                      </div>
                    </button>
                  ))}
                  
                  <div className="border-t border-gray-200 pt-3">
                    <button
                      onClick={() => handleCreateShipment()} // Auto-select cheapest
                      disabled={creatingShipment}
                      className="w-full p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left disabled:opacity-50"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-gray-900">💰 Automatyczny wybór</p>
                          <p className="text-sm text-gray-600">System wybierze najtańszą dostępną opcję</p>
                        </div>
                        <span className="text-blue-600 font-medium">Najlepsza cena</span>
                      </div>
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">Nie udało się pobrać opcji wysyłki</p>
                  <button
                    onClick={() => handleCreateShipment()}
                    disabled={creatingShipment}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    Utwórz z domyślnymi ustawieniami
                  </button>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowShippingModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Anuluj
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}