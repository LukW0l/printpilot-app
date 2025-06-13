'use client'

import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { formStyles } from '@/styles/form-styles'
import { 
  PlusIcon,
  ShoppingCartIcon,
  TruckIcon,
  CheckCircleIcon,
  ClockIcon,
  BuildingStorefrontIcon
} from '@heroicons/react/24/outline'

interface FrameKit {
  id: string
  name: string
  width: number
  height: number
  frameType: 'THIN' | 'THICK'
  crossbars: number
  description?: string
  isActive: boolean
}

interface Supplier {
  id: string
  name: string
  city: string
  category: string
  deliveryTime?: number
  minimumOrderValue?: number
  isActive: boolean
  products: SupplierProduct[]
}

interface SupplierProduct {
  id: string
  name: string
  sku?: string
  category: string
  width?: number
  height?: number
  unitPrice: number
  currency: string
  minimumQuantity: number
  bulkPrice?: number
  bulkMinQuantity?: number
  inStock: boolean
  leadTime?: number
}

interface OrderItem {
  productId: string
  productName: string
  sku?: string
  category: string
  width?: number
  height?: number
  unitPrice: number
  quantity: number
  totalPrice: number
}

interface FrameOrder {
  supplierId: string
  items: OrderItem[]
  notes?: string
  expectedDelivery?: string
}

export default function FrameOrdersPage() {
  const [frameKits, setFrameKits] = useState<FrameKit[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [selectedSupplier, setSelectedSupplier] = useState<string>('')
  const [currentOrder, setCurrentOrder] = useState<FrameOrder>({
    supplierId: '',
    items: []
  })
  const [showNewOrder, setShowNewOrder] = useState(false)
  const [loading, setLoading] = useState(true)
  const [orderHistory, setOrderHistory] = useState<any[]>([])
  const [selectedOrder, setSelectedOrder] = useState<any>(null)

  useEffect(() => {
    fetchData()
  }, [])


  const fetchData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        fetchFrameKits(),
        fetchSuppliers(),
        fetchOrderHistory()
      ])
    } finally {
      setLoading(false)
    }
  }

  const fetchFrameKits = async () => {
    try {
      const response = await fetch('/api/frame-kits')
      const data = await response.json()
      if (data.success) {
        setFrameKits(data.data)
      }
    } catch (error) {
      console.error('Error fetching frame kits:', error)
    }
  }

  const fetchSuppliers = async () => {
    try {
      const response = await fetch('/api/suppliers?action=list&category=FRAMES')
      const data = await response.json()
      if (data.success) {
        setSuppliers(data.data)
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error)
    }
  }

  const fetchOrderHistory = async () => {
    try {
      const response = await fetch('/api/supplier-orders?category=FRAMES')
      const data = await response.json()
      if (data.success) {
        setOrderHistory(data.data)
      }
    } catch (error) {
      console.error('Error fetching order history:', error)
    }
  }

  const handleSupplierChange = (supplierId: string) => {
    setSelectedSupplier(supplierId)
    setCurrentOrder({
      supplierId,
      items: []
    })
  }

  const addToOrder = (product: SupplierProduct, quantity: number) => {
    const existingItemIndex = currentOrder.items.findIndex(item => item.productId === product.id)
    
    if (existingItemIndex >= 0) {
      // Aktualizuj istniejący element
      const updatedItems = [...currentOrder.items]
      updatedItems[existingItemIndex].quantity += quantity
      updatedItems[existingItemIndex].totalPrice = updatedItems[existingItemIndex].quantity * product.unitPrice
      
      setCurrentOrder(prev => ({
        ...prev,
        items: updatedItems
      }))
    } else {
      // Dodaj nowy element
      const newItem: OrderItem = {
        productId: product.id,
        productName: product.name || 'Unknown Product',
        sku: product.sku,
        category: product.category,
        width: product.width,
        height: product.height,
        unitPrice: product.unitPrice,
        quantity,
        totalPrice: quantity * product.unitPrice
      }
      
      setCurrentOrder(prev => ({
        ...prev,
        items: [...prev.items, newItem]
      }))
    }

    // Note: currentOrder.items will still be old here due to React state update timing
    // console.log('📋 Current order items after:', currentOrder.items)
    toast.success(`Dodano ${quantity}x ${product.name || 'Unknown Product'} do zamówienia`)
  }

  const removeFromOrder = (productId: string) => {
    setCurrentOrder(prev => ({
      ...prev,
      items: prev.items.filter(item => item.productId !== productId)
    }))
  }

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromOrder(productId)
      return
    }

    setCurrentOrder(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.productId === productId
          ? {
              ...item,
              quantity: newQuantity,
              totalPrice: newQuantity * item.unitPrice
            }
          : item
      )
    }))
  }

  const getTotalOrderValue = () => {
    return currentOrder.items.reduce((sum, item) => sum + item.totalPrice, 0)
  }

  const placeOrder = async () => {
    if (!currentOrder.supplierId || currentOrder.items.length === 0) {
      toast.error('Wybierz dostawcę i dodaj produkty do zamówienia')
      return
    }

    try {
      const response = await fetch('/api/supplier-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentOrder)
      })

      const data = await response.json()
      
      if (data.success) {
        toast.success('Zamówienie zostało złożone!')
        setCurrentOrder({ supplierId: '', items: [] })
        setSelectedSupplier('')
        setShowNewOrder(false)
        fetchOrderHistory()
      } else {
        toast.error(data.error || 'Nie udało się złożyć zamówienia')
      }
    } catch (error) {
      console.error('Error placing order:', error)
      toast.error('Błąd podczas składania zamówienia')
    }
  }

  const getStatusConfig = (status: string) => {
    const configs = {
      DRAFT: { color: 'bg-gray-100 text-gray-800', label: 'Projekt', icon: ClockIcon },
      SENT: { color: 'bg-blue-100 text-blue-800', label: 'Wysłane', icon: TruckIcon },
      CONFIRMED: { color: 'bg-green-100 text-green-800', label: 'Potwierdzone', icon: CheckCircleIcon },
      DELIVERED: { color: 'bg-emerald-100 text-emerald-800', label: 'Dostarczone', icon: CheckCircleIcon },
      CANCELLED: { color: 'bg-red-100 text-red-800', label: 'Anulowane', icon: ClockIcon }
    }
    return configs[status as keyof typeof configs] || configs.DRAFT
  }

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/supplier-orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      const data = await response.json()
      if (data.success) {
        toast.success(`Status zamówienia zmieniony na: ${getStatusConfig(newStatus).label}`)
        fetchOrderHistory()
      } else {
        toast.error(data.error || 'Nie udało się zmienić statusu')
      }
    } catch (error) {
      console.error('Error updating order status:', error)
      toast.error('Błąd podczas zmiany statusu')
    }
  }

  const handleDelivery = async (orderId: string) => {
    if (!confirm('Czy na pewno chcesz przyjąć tę dostawę na stan magazynowy? Wszystkie produkty zostaną dodane do magazynu.')) {
      return
    }

    try {
      // Najpierw pobierz szczegóły zamówienia
      const orderResponse = await fetch(`/api/supplier-orders/${orderId}`)
      const orderData = await orderResponse.json()
      
      if (!orderData.success) {
        toast.error('Nie udało się pobrać szczegółów zamówienia')
        return
      }

      // Przygotuj dane o dostarczonych produktach (przyjmij wszystkie w pełnej ilości)
      const deliveryItems = orderData.data.items.map((item: any) => ({
        itemId: item.id,
        receivedQuantity: item.quantity
      }))

      // Wykonaj dostęp
      const response = await fetch(`/api/supplier-orders/${orderId}/delivery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: deliveryItems,
          actualDeliveryDate: new Date().toISOString(),
          notes: 'Dostawa przyjęta automatycznie - pełna ilość'
        })
      })

      const data = await response.json()
      if (data.success) {
        toast.success('Dostawa przyjęta! Magazyn został zaktualizowany.')
        fetchOrderHistory()
      } else {
        toast.error(data.error || 'Nie udało się przyjąć dostawy')
      }
    } catch (error) {
      console.error('Error handling delivery:', error)
      toast.error('Błąd podczas przyjmowania dostawy')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-black">Ładowanie systemu zamówień krosien...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 -mx-6 -mt-6 px-6 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <BuildingStorefrontIcon className="h-8 w-8 text-black mr-3" />
            <div>
              <h1 className="text-2xl font-semibold text-black sm:text-3xl">Zamówienia krosien</h1>
              <p className="text-sm text-black mt-1">Zarządzanie zamówieniami ram i kompletnych zestawów</p>
            </div>
          </div>
          <button
            onClick={() => setShowNewOrder(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Nowe zamówienie
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BuildingStorefrontIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-black">Dostawcy ram</p>
              <p className="text-2xl font-semibold text-black">{suppliers.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <ShoppingCartIcon className="h-6 w-6 text-black" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-black">Zestawy krosien</p>
              <p className="text-2xl font-semibold text-black">{frameKits.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <ClockIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-black">Oczekujące zamówienia</p>
              <p className="text-2xl font-semibold text-black">
                {orderHistory.filter(order => ['SENT', 'CONFIRMED'].includes(order.status)).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TruckIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-black">Dostarczone (miesiąc)</p>
              <p className="text-2xl font-semibold text-black">
                {orderHistory.filter(order => 
                  order.status === 'DELIVERED' && 
                  new Date(order.actualDelivery).getMonth() === new Date().getMonth()
                ).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-black">
            Historia zamówień ({orderHistory.length})
          </h2>
        </div>

        {orderHistory.length === 0 ? (
          <div className="p-12 text-center">
            <ShoppingCartIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-black mb-2">Brak zamówień</h3>
            <p className="text-black mb-6">
              Rozpocznij od złożenia pierwszego zamówienia na krosna i materiały.
            </p>
            <button
              onClick={() => setShowNewOrder(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Złóż pierwsze zamówienie
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                    Zamówienie
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                    Dostawca
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                    Wartość
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                    Data zamówienia
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                    Oczekiwana dostawa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                    Akcje
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orderHistory.slice(0, 10).map((order) => {
                  const statusConfig = getStatusConfig(order.status)
                  const StatusIcon = statusConfig.icon
                  
                  return (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-black">
                        #{order.orderNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                        {order.supplier?.name || 'Unknown Supplier'} ({order.supplier?.city || 'Unknown City'})
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                        {Number(order.totalAmount).toFixed(2)} {order.currency}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                        {new Date(order.orderDate).toLocaleDateString('pl-PL')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                        {order.expectedDelivery ? new Date(order.expectedDelivery).toLocaleDateString('pl-PL') : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Podgląd
                          </button>
                          {['SENT', 'CONFIRMED'].includes(order.status) && (
                            <button
                              onClick={() => handleDelivery(order.id)}
                              className="text-green-600 hover:text-green-800 text-sm font-medium"
                            >
                              Przyjmij dostawę
                            </button>
                          )}
                          {order.status === 'SENT' && (
                            <button
                              onClick={() => updateOrderStatus(order.id, 'CONFIRMED')}
                              className="text-green-600 hover:text-green-800 text-sm font-medium"
                            >
                              Potwierdź
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Order Modal */}
      {showNewOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-black">Nowe zamówienie krosien</h2>
                <button
                  onClick={() => setShowNewOrder(false)}
                  className="text-gray-400 hover:text-black"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Supplier Selection */}
                <div className="lg:col-span-2">
                  <div className="space-y-6">
                    {/* Supplier Selection */}
                    <div>
                      <label className={formStyles.label}>
                        Wybierz dostawcę *
                      </label>
                      <select 
                        value={selectedSupplier}
                        onChange={(e) => handleSupplierChange(e.target.value)}
                        className={formStyles.select}
                      >
                        <option value="">Wybierz dostawcę...</option>
                        {suppliers.map((supplier) => (
                          <option key={supplier.id} value={supplier.id}>
                            {supplier.name || 'Unknown Supplier'} - {supplier.city || 'Unknown City'} 
                            {supplier.deliveryTime && ` (dostawa: ${supplier.deliveryTime} dni)`}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Products */}
                    {selectedSupplier && suppliers.find(s => s.id === selectedSupplier) && (
                      <div>
                        <h3 className="text-lg font-semibold text-black mb-4">Dostępne produkty</h3>
                        
                        {(() => {
                          const supplier = suppliers.find(s => s.id === selectedSupplier)!
                          const allProducts = supplier.products || []
                          
                          // Filter out custom products (one-time orders)
                          const products = allProducts.filter(product => {
                            // Hide custom frame products (created for specific orders)
                            if (product.sku && product.sku.startsWith('FRAME-') && product.sku.includes('x')) {
                              // Check if it's a standard size by looking for THIN/THICK suffix
                              const hasStandardSuffix = product.sku.endsWith('-THIN') || product.sku.endsWith('-THICK')
                              if (!hasStandardSuffix) {
                                return false // Hide custom frames without standard suffix
                              }
                            }
                            
                            return true // Show all other products including standard frames
                          })
                          
                          
                          const productsByCategory = products.reduce((acc, product) => {
                            if (!acc[product.category]) acc[product.category] = []
                            acc[product.category].push(product)
                            return acc
                          }, {} as Record<string, SupplierProduct[]>)

                          // Check if no products available
                          if (Object.keys(productsByCategory).length === 0) {
                            return (
                              <div className="text-center py-8">
                                <p className="text-black mb-4">
                                  Brak dostępnych produktów dla tego dostawcy.
                                </p>
                                {supplier.name.includes('Tempich') && (
                                  <>
                                    <p className="text-sm text-gray-600 mb-4">
                                      Wygląda na to, że standardowe produkty nie zostały jeszcze utworzone.
                                    </p>
                                    <button
                                      onClick={async () => {
                                        try {
                                          // Try the new endpoint first, fallback to old one
                                          let response = await fetch('/api/init-vercel-products?secret=init-vercel-2025')
                                          
                                          if (!response.ok) {
                                            // Fallback to old endpoint
                                            response = await fetch('/api/frame-kits', {
                                              method: 'POST',
                                              headers: { 'Content-Type': 'application/json' },
                                              body: JSON.stringify({ action: 'init-standard-products' })
                                            })
                                          }
                                          
                                          const data = await response.json()
                                          if (data.success) {
                                            toast.success(`Produkty utworzone! (${data.data?.newProductsCreated || data.data?.productsCreated || 'nieznana liczba'})`)
                                            fetchSuppliers() // Refresh suppliers
                                          } else {
                                            toast.error(data.message || data.error || 'Nie udało się utworzyć produktów')
                                          }
                                        } catch (error) {
                                          toast.error('Błąd podczas tworzenia produktów')
                                        }
                                      }}
                                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                    >
                                      Utwórz standardowe produkty
                                    </button>
                                  </>
                                )}
                              </div>
                            )
                          }

                          return Object.entries(productsByCategory).map(([category, products]) => (
                            <div key={category} className="mb-6">
                              <h4 className="font-medium text-black mb-3">
                                {category === 'FRAME_KITS' || category === 'FRAME_KITS_CUSTOM' ? 'Kompletne zestawy' : 
                                 category === 'FRAME_STRIPS' || category === 'FRAME_STRIPS_CUSTOM' ? 'Pojedyncze listwy' :
                                 category === 'CROSSBARS' ? 'Poprzeczki' : category}
                              </h4>
                              {(category === 'FRAME_KITS' || category === 'FRAME_KITS_CUSTOM') ? (
                                <>
                                  {/* Kompletne zestawy - zachowaj karty */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {products.map((product) => (
                                    <div key={product.id} className={formStyles.itemCard}>
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                          <h5 className="font-medium text-black">{product.name || 'Unknown Product'}</h5>
                                          {product.sku && (
                                            <p className="text-sm text-black">SKU: {product.sku}</p>
                                          )}
                                          {product.width && product.height && (
                                            <p className="text-sm text-black">
                                              Wymiary: {product.width}×{product.height}cm
                                            </p>
                                          )}
                                          <div className="mt-2">
                                            <span className="text-lg font-semibold text-black">
                                              {product.unitPrice.toFixed(2)} {product.currency}
                                            </span>
                                            {product.bulkPrice && (
                                              <span className="text-sm text-black ml-2">
                                                (od {product.bulkMinQuantity} szt: {product.bulkPrice.toFixed(2)} {product.currency})
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-xs text-black mt-1">
                                            Min. zamówienie: {product.minimumQuantity} szt
                                            {product.leadTime && ` • Czas realizacji: ${product.leadTime} dni`}
                                          </p>
                                        </div>
                                        <div className="ml-4 flex flex-col gap-2">
                                          <div className="flex items-center gap-2">
                                            <input
                                              type="number"
                                              min={product.minimumQuantity}
                                              max="999"
                                              defaultValue={product.minimumQuantity}
                                              className={`w-16 ${formStyles.input.replace('w-full', '')}`}
                                              id={`qty-${product.id}`}
                                            />
                                            <button
                                              onClick={() => {
                                                const input = document.getElementById(`qty-${product.id}`) as HTMLInputElement
                                                const qty = parseInt(input.value) || product.minimumQuantity
                                                addToOrder(product, qty)
                                              }}
                                              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                                            >
                                              Dodaj
                                            </button>
                                          </div>
                                          <div className="flex gap-1">
                                            <button
                                              onClick={() => addToOrder(product, product.minimumQuantity)}
                                              className="px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
                                            >
                                              +{product.minimumQuantity}
                                            </button>
                                            <button
                                              onClick={() => addToOrder(product, product.minimumQuantity * 2)}
                                              className="px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
                                            >
                                              +{product.minimumQuantity * 2}
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                  </div>
                                </>
                              ) : category === 'CROSSBARS' ? (
                                <>
                                  {/* Poprzeczki - kompaktowa tabela */}
                                  <div className={`${formStyles.container} p-0 overflow-hidden`}>
                                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                                      <table className="min-w-full">
                                        <thead className={formStyles.tableHeader}>
                                          <tr>
                                            <th className="px-3 py-1 text-left text-xs font-medium text-black uppercase w-20">Rozmiar</th>
                                            <th className="px-3 py-1 text-left text-xs font-medium text-black uppercase">Cena</th>
                                            <th className="px-3 py-1 text-left text-xs font-medium text-black uppercase w-20">Ilość</th>
                                            <th className="px-3 py-1 text-left text-xs font-medium text-black uppercase w-32">Akcje</th>
                                          </tr>
                                        </thead>
                                        <tbody className="bg-white">
                                          {products
                                            .sort((a, b) => (a.width || 0) - (b.width || 0))
                                            .map((product, index) => (
                                            <tr key={product.id} className={`${formStyles.tableRow} ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                              <td className="px-3 py-1 text-sm font-medium text-black">
                                                {product.width}cm
                                              </td>
                                              <td className="px-3 py-1">
                                                <span className="text-sm font-semibold text-black">
                                                  {product.unitPrice.toFixed(2)} PLN
                                                </span>
                                                {product.bulkPrice && (
                                                  <span className="text-xs text-black ml-2">
                                                    (od {product.bulkMinQuantity}: {product.bulkPrice.toFixed(2)} PLN)
                                                  </span>
                                                )}
                                              </td>
                                              <td className="px-3 py-1">
                                                <input
                                                  type="number"
                                                  min={product.minimumQuantity}
                                                  max="999"
                                                  defaultValue={product.minimumQuantity}
                                                  className={`w-16 text-xs ${formStyles.input.replace('w-full', '').replace('py-2', 'py-1')}`}
                                                  id={`qty-crossbar-${product.id}`}
                                                />
                                              </td>
                                              <td className="px-3 py-1">
                                                <div className="flex items-center gap-1">
                                                  <button
                                                    onClick={() => {
                                                      const input = document.getElementById(`qty-crossbar-${product.id}`) as HTMLInputElement
                                                      const qty = parseInt(input.value) || product.minimumQuantity
                                                      addToOrder(product, qty)
                                                    }}
                                                    className="px-2 py-0.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                                                  >
                                                    Dodaj
                                                  </button>
                                                  <button
                                                    onClick={() => addToOrder(product, product.minimumQuantity)}
                                                    className="px-1 py-0.5 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200"
                                                  >
                                                    +{product.minimumQuantity}
                                                  </button>
                                                </div>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <>
                                  {/* Listwy i poprzeczki - kompaktowa tabela */}
                                  <div className={`${formStyles.container} p-0 overflow-hidden`}>
                                    {(() => {
                                      // Grupuj produkty według typu (cienkie, grube, poprzeczki)
                                      const thinStrips = products.filter(p => (p.name || '').includes('cienka'))
                                      const thickStrips = products.filter(p => (p.name || '').includes('gruba'))
                                      const crossbars = products.filter(p => (p.name || '').includes('Poprzeczka'))

                                      const groups = [
                                        { name: 'Listwy cienkie', sku: 'TEMP-THIN-XX', products: thinStrips },
                                        { name: 'Listwy grube', sku: 'TEMP-THICK-XX', products: thickStrips },
                                        { name: 'Poprzeczki', sku: 'TEMP-CROSS-XX', products: crossbars }
                                      ]

                                      return (
                                        <div className="space-y-4">
                                          {groups.map((group, groupIndex) => 
                                            group.products.length > 0 && (
                                              <div key={`group-${groupIndex}-${group.name}`}>
                                                {/* Nagłówek grupy */}
                                                <div className="bg-gray-100 px-4 py-2 rounded-t-lg">
                                                  <h5 className="text-sm font-semibold text-black">
                                                    {group.name || 'Unknown Group'} ({group.sku || 'No SKU'})
                                                  </h5>
                                                </div>
                                                
                                                {/* Tabela produktów */}
                                                <div className="overflow-x-auto border border-gray-200 rounded-b-lg">
                                                  <table className="min-w-full">
                                                    <thead className={formStyles.tableHeader}>
                                                      <tr>
                                                        <th className="px-3 py-1 text-left text-xs font-medium text-black uppercase w-20">Rozmiar</th>
                                                        <th className="px-3 py-1 text-left text-xs font-medium text-black uppercase">Cena</th>
                                                        <th className="px-3 py-1 text-left text-xs font-medium text-black uppercase w-20">Ilość</th>
                                                        <th className="px-3 py-1 text-left text-xs font-medium text-black uppercase w-32">Akcje</th>
                                                      </tr>
                                                    </thead>
                                                    <tbody className="bg-white">
                                                      {group.products
                                                        .sort((a, b) => (a.width || 0) - (b.width || 0))
                                                        .map((product, index) => (
                                                        <tr key={product.id} className={`${formStyles.tableRow} ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                                          <td className="px-3 py-1 text-sm font-medium text-black">
                                                            {product.width}cm
                                                          </td>
                                                          <td className="px-3 py-1">
                                                            <span className="text-sm font-semibold text-black">
                                                              {product.unitPrice.toFixed(2)} PLN
                                                            </span>
                                                            {product.bulkPrice && (
                                                              <span className="text-xs text-black ml-2">
                                                                (od {product.bulkMinQuantity}: {product.bulkPrice.toFixed(2)} PLN)
                                                              </span>
                                                            )}
                                                          </td>
                                                          <td className="px-3 py-1">
                                                            <input
                                                              type="number"
                                                              min={product.minimumQuantity}
                                                              max="999"
                                                              defaultValue={product.minimumQuantity}
                                                              className={`w-16 text-xs ${formStyles.input.replace('w-full', '').replace('py-2', 'py-1')}`}
                                                              id={`qty-compact-${product.id}`}
                                                            />
                                                          </td>
                                                          <td className="px-3 py-1">
                                                            <div className="flex items-center gap-1">
                                                              <button
                                                                onClick={() => {
                                                                  const input = document.getElementById(`qty-compact-${product.id}`) as HTMLInputElement
                                                                  const qty = parseInt(input.value) || product.minimumQuantity
                                                                  addToOrder(product, qty)
                                                                }}
                                                                className="px-2 py-0.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                                                              >
                                                                Dodaj
                                                              </button>
                                                              <button
                                                                onClick={() => addToOrder(product, product.minimumQuantity)}
                                                                className="px-1 py-0.5 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200"
                                                              >
                                                                +{product.minimumQuantity}
                                                              </button>
                                                            </div>
                                                          </td>
                                                        </tr>
                                                      ))}
                                                    </tbody>
                                                  </table>
                                                </div>
                                              </div>
                                            )
                                          )}
                                        </div>
                                      )
                                    })()}
                                  </div>
                                </>
                              )}
                            </div>
                          ))
                        })()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Order Summary */}
                <div>
                  <div className="bg-gray-50 rounded-lg p-4 sticky top-0">
                    <h3 className="text-lg font-semibold text-black mb-4">Podsumowanie zamówienia</h3>
                    
                    {currentOrder.items.length === 0 ? (
                      <p className="text-black text-center py-8">
                        Koszyk jest pusty.<br />
                        Dodaj produkty z listy po lewej.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {currentOrder.items.map((item) => (
                          <div key={item.productId} className="bg-white rounded-lg p-3 border">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h5 className="font-medium text-black text-sm">{item.productName}</h5>
                                {item.sku && (
                                  <p className="text-xs text-black">{item.sku}</p>
                                )}
                                {item.width && item.height && (
                                  <p className="text-xs text-black">{item.width}×{item.height}cm</p>
                                )}
                                <div className="flex items-center mt-2">
                                  <button
                                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                                    className="w-6 h-6 flex items-center justify-center bg-gray-200 rounded text-sm hover:bg-gray-300"
                                  >
                                    -
                                  </button>
                                  <span className="mx-2 text-sm font-medium">{item.quantity}</span>
                                  <button
                                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                                    className="w-6 h-6 flex items-center justify-center bg-gray-200 rounded text-sm hover:bg-gray-300"
                                  >
                                    +
                                  </button>
                                  <button
                                    onClick={() => removeFromOrder(item.productId)}
                                    className="ml-2 text-red-600 hover:text-red-800 text-sm"
                                  >
                                    Usuń
                                  </button>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-black">
                                  {item.totalPrice.toFixed(2)} PLN
                                </p>
                                <p className="text-xs text-black">
                                  {item.unitPrice.toFixed(2)} PLN/szt
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        <div className="border-t pt-3 mt-4">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-black">Razem:</span>
                            <span className="text-xl font-bold text-black">
                              {getTotalOrderValue().toFixed(2)} PLN
                            </span>
                          </div>
                          
                          {selectedSupplier && (() => {
                            const supplier = suppliers.find(s => s.id === selectedSupplier)!
                            const total = getTotalOrderValue()
                            return (
                              <div className="mt-2 text-sm text-black">
                                {supplier.minimumOrderValue && total < supplier.minimumOrderValue && (
                                  <p className="text-orange-600">
                                    ⚠️ Min. wartość zamówienia: {supplier.minimumOrderValue.toFixed(2)} PLN
                                  </p>
                                )}
                                {supplier.deliveryTime && (
                                  <p>📅 Czas dostawy: {supplier.deliveryTime} dni</p>
                                )}
                              </div>
                            )
                          })()}
                        </div>
                        
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Uwagi do zamówienia
                          </label>
                          <textarea
                            value={currentOrder.notes || ''}
                            onChange={(e) => setCurrentOrder(prev => ({ ...prev, notes: e.target.value }))}
                            className={formStyles.textarea}
                            rows={3}
                            placeholder="Dodatkowe informacje, uwagi specjalne..."
                          />
                        </div>
                        
                        <button
                          onClick={placeOrder}
                          disabled={currentOrder.items.length === 0 || !currentOrder.supplierId}
                          className="w-full mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          Złóż zamówienie
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal podglądu zamówienia */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-black">
                  Zamówienie #{selectedOrder.orderNumber}
                </h2>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-black hover:text-black"
                >
                  <span className="sr-only">Zamknij</span>
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Informacje o zamówieniu */}
                <div className={formStyles.container}>
                  <h3 className={formStyles.sectionTitle}>Informacje o zamówieniu</h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-black">Status:</span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ml-2 ${getStatusConfig(selectedOrder.status).color}`}>
                        {getStatusConfig(selectedOrder.status).label}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-black">Data zamówienia:</span>
                      <span className="ml-2 text-sm text-black">
                        {new Date(selectedOrder.orderDate).toLocaleDateString('pl-PL')}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-black">Oczekiwana dostawa:</span>
                      <span className="ml-2 text-sm text-black">
                        {selectedOrder.expectedDelivery ? new Date(selectedOrder.expectedDelivery).toLocaleDateString('pl-PL') : 'Nie określono'}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-black">Wartość całkowita:</span>
                      <span className="ml-2 text-sm font-semibold text-black">
                        {Number(selectedOrder.totalAmount).toFixed(2)} {selectedOrder.currency}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Informacje o dostawcy */}
                <div className={formStyles.container}>
                  <h3 className={formStyles.sectionTitle}>Dostawca</h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-black">Nazwa:</span>
                      <span className="ml-2 text-sm text-black">{selectedOrder.supplier?.name || 'Unknown Supplier'}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-black">Miejscowość:</span>
                      <span className="ml-2 text-sm text-black">{selectedOrder.supplier?.city}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-black">Email:</span>
                      <span className="ml-2 text-sm text-black">{selectedOrder.supplier?.email}</span>
                    </div>
                    {selectedOrder.supplier?.phone && (
                      <div>
                        <span className="text-sm font-medium text-black">Telefon:</span>
                        <span className="ml-2 text-sm text-black">{selectedOrder.supplier.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Lista produktów */}
              <div className={formStyles.container}>
                <h3 className={formStyles.sectionTitle}>Produkty w zamówieniu</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className={formStyles.tableHeader}>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                          Produkt
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                          SKU
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                          Ilość
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                          Cena jedn.
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                          Wartość
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedOrder.items?.map((item: any, index: number) => (
                        <tr key={index} className={formStyles.tableRow}>
                          <td className="px-4 py-3 text-sm text-black">{item.product?.name || item.productName || 'Unknown Product'}</td>
                          <td className="px-4 py-3 text-sm text-black">{item.product?.sku || item.sku}</td>
                          <td className="px-4 py-3 text-sm text-black">{item.quantity} szt</td>
                          <td className="px-4 py-3 text-sm text-black">{Number(item.unitPrice).toFixed(2)} PLN</td>
                          <td className="px-4 py-3 text-sm text-black">{Number(item.totalPrice).toFixed(2)} PLN</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Akcje */}
              <div className="flex justify-between items-center mt-6">
                <div className="flex space-x-3">
                  {selectedOrder.status === 'DRAFT' && (
                    <button
                      onClick={() => {
                        updateOrderStatus(selectedOrder.id, 'SENT')
                        setSelectedOrder(null)
                      }}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium"
                    >
                      Wyślij zamówienie
                    </button>
                  )}
                  {selectedOrder.status === 'SENT' && (
                    <button
                      onClick={() => {
                        updateOrderStatus(selectedOrder.id, 'CONFIRMED')
                        setSelectedOrder(null)
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                    >
                      Potwierdź zamówienie
                    </button>
                  )}
                  {['SENT', 'CONFIRMED'].includes(selectedOrder.status) && (
                    <button
                      onClick={() => {
                        handleDelivery(selectedOrder.id)
                        setSelectedOrder(null)
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                    >
                      Przyjmij dostawę na stan
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="px-4 py-2 bg-gray-300 text-black rounded-lg hover:bg-gray-400 text-sm font-medium"
                >
                  Zamknij
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}