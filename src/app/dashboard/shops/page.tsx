'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface Shop {
  id: string
  name: string
  platform: string
  url: string
  isActive: boolean
  createdAt: string
  _count?: {
    orders: number
  }
}

interface SyncStatus {
  shop: {
    id: string
    name: string
    url: string
    platform: string
    isActive: boolean
  }
  counts: {
    database: number
    woocommerce: number
    difference: number
  }
  lastSync: {
    id: string
    status: string
    startedAt: string
    finishedAt: string | null
    duration: number | null
    totalOrders: number
    newOrders: number
    updatedOrders: number
    failedOrders: number
    apiOrderCount: number | null
    errorMessage: string | null
  } | null
  errors: {
    woocommerce: string | null
  }
}

export default function ShopsPage() {
  const router = useRouter()
  const [shops, setShops] = useState<Shop[]>([])
  const [syncStatuses, setSyncStatuses] = useState<Record<string, SyncStatus>>({})
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingShop, setEditingShop] = useState<Shop | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    platform: 'woocommerce',
    url: '',
    apiKey: '',
    apiSecret: ''
  })

  useEffect(() => {
    fetchShops()
  }, [])

  const fetchShops = async () => {
    try {
      const response = await fetch('/api/shops')
      const data = await response.json()
      setShops(data.shops || [])
      
      // Fetch sync statuses for each shop
      if (data.shops && data.shops.length > 0) {
        fetchSyncStatuses(data.shops)
      }
    } catch (error) {
      console.error('Error fetching shops:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSyncStatuses = async (shopsToFetch: Shop[]) => {
    const statusPromises = shopsToFetch.map(async (shop) => {
      try {
        const response = await fetch(`/api/shops/${shop.id}/sync-status`)
        if (response.ok) {
          const status = await response.json()
          return { shopId: shop.id, status }
        }
      } catch (error) {
        console.error(`Error fetching sync status for shop ${shop.id}:`, error)
      }
      return null
    })

    const results = await Promise.all(statusPromises)
    const newSyncStatuses: Record<string, SyncStatus> = {}
    
    results.forEach((result) => {
      if (result) {
        newSyncStatuses[result.shopId] = result.status
      }
    })
    
    setSyncStatuses(newSyncStatuses)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingShop) {
        toast.loading('Aktualizowanie sklepu...', { id: 'update-shop' })
        const response = await fetch(`/api/shops/${editingShop.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            isActive: editingShop.isActive
          })
        })
        
        if (response.ok) {
          toast.success('Sklep został zaktualizowany pomyślnie!', { id: 'update-shop' })
          setShowModal(false)
          setEditingShop(null)
          setFormData({
            name: '',
            platform: 'woocommerce',
            url: '',
            apiKey: '',
            apiSecret: ''
          })
          fetchShops()
        } else {
          toast.error('Nie udało się zaktualizować sklepu', { id: 'update-shop' })
        }
      } else {
        toast.loading('Tworzenie sklepu...', { id: 'create-shop' })
        const response = await fetch('/api/shops', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        })
        
        if (response.ok) {
          toast.success('Sklep został utworzony pomyślnie!', { id: 'create-shop' })
          setShowModal(false)
          setFormData({
            name: '',
            platform: 'woocommerce',
            url: '',
            apiKey: '',
            apiSecret: ''
          })
          fetchShops()
        } else {
          toast.error('Nie udało się utworzyć sklepu', { id: 'create-shop' })
        }
      }
    } catch (error) {
      console.error('Error saving shop:', error)
      toast.error('Failed to save shop', { id: editingShop ? 'update-shop' : 'create-shop' })
    }
  }

  const syncShop = async (shopId: string) => {
    try {
      toast.loading('Synchronizacja zamówień...', { id: `sync-${shopId}` })
      const response = await fetch(`/api/sync/woocommerce/${shopId}`, {
        method: 'POST'
      })
      
      let data
      try {
        data = await response.json()
      } catch (parseError) {
        console.error('Failed to parse response:', parseError)
        data = { error: 'Invalid response from server' }
      }
      
      if (response.ok) {
        toast.success(`Zsynchronizowano ${data.count || 0} zamówień pomyślnie!`, { id: `sync-${shopId}` })
        // Refresh shops and sync statuses
        fetchShops()
      } else {
        const errorMessage = data.error || 'Nie udało się zsynchronizować zamówień'
        toast.error(errorMessage, { id: `sync-${shopId}` })
        console.error('Sync error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorMessage,
          data: data,
          details: data?.details || 'No additional details available'
        })
      }
    } catch (error) {
      console.error('Error syncing shop:', error)
      toast.error('Nie udało się zsynchronizować zamówień', { id: `sync-${shopId}` })
    }
  }

  const testShopConnection = async (shopId: string) => {
    try {
      toast.loading('Testowanie połączenia...', { id: `test-${shopId}` })
      const response = await fetch(`/api/shops/test/${shopId}`)
      const data = await response.json()
      
      if (response.ok) {
        if (data.tests.authentication) {
          toast.success(`Połączenie udane! Znaleziono ${data.tests.orderCount} zamówień.`, { id: `test-${shopId}` })
        } else {
          toast.error('Połączenie nie powiodło się. Sprawdź dane API.', { id: `test-${shopId}` })
        }
        console.log('Test results:', data)
      } else {
        toast.error('Test nie powiódł się', { id: `test-${shopId}` })
      }
    } catch (error) {
      console.error('Error testing shop:', error)
      toast.error('Nie udało się przetestować połączenia', { id: `test-${shopId}` })
    }
  }

  const handleEdit = (shop: Shop) => {
    setEditingShop(shop)
    setFormData({
      name: shop.name,
      platform: shop.platform,
      url: shop.url,
      apiKey: '',
      apiSecret: ''
    })
    setShowModal(true)
  }

  const handleDelete = async (shopId: string) => {
    try {
      toast.loading('Usuwanie sklepu...', { id: `delete-${shopId}` })
      const response = await fetch(`/api/shops/${shopId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        toast.success('Sklep został usunięty', { id: `delete-${shopId}` })
        setShowDeleteConfirm(null)
        fetchShops()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Nie udało się usunąć sklepu', { id: `delete-${shopId}` })
      }
    } catch (error) {
      console.error('Error deleting shop:', error)
      toast.error('Nie udało się usunąć sklepu', { id: `delete-${shopId}` })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-3 sm:py-4 gap-3">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/dashboard')}
                className="mr-3 sm:mr-4 text-gray-500 hover:text-gray-700"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Sklepy</h1>
                <span className="inline-block mt-0.5 sm:mt-0 sm:ml-2 text-xs sm:text-sm bg-blue-100 text-blue-800 px-2 py-0.5 sm:py-1 rounded-full">
                  Zarządzanie
                </span>
              </div>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center justify-center px-3 py-2 sm:px-4 sm:py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <span className="hidden sm:inline">🏪 Dodaj sklep</span>
              <span className="sm:hidden">🏪 Dodaj</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Shops Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          {shops.map((shop) => (
            <div key={shop.id} className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-lg transition-shadow duration-200">
              <div className="flex justify-between items-start mb-3 sm:mb-4">
                <div>
                  <h3 className="text-base sm:text-lg font-medium text-gray-900">{shop.name}</h3>
                  <p className="text-xs sm:text-sm text-gray-500 capitalize">{shop.platform}</p>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  shop.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {shop.isActive ? 'Aktywny' : 'Nieaktywny'}
                </span>
              </div>
              
              <div className="space-y-1 sm:space-y-2 mb-3 sm:mb-4">
                <p className="text-xs sm:text-sm text-gray-600 truncate">{shop.url}</p>
                
                {/* Order counts comparison */}
                {syncStatuses[shop.id] ? (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-gray-500">WooCommerce:</span>
                      <span className="font-medium text-blue-600">
                        {syncStatuses[shop.id].counts.woocommerce}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-gray-500">Baza danych:</span>
                      <span className="font-medium text-green-600">
                        {syncStatuses[shop.id].counts.database}
                      </span>
                    </div>
                    {syncStatuses[shop.id].counts.difference > 0 && (
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-gray-500">Do zsynchronizowania:</span>
                        <span className="font-medium text-orange-600">
                          {syncStatuses[shop.id].counts.difference}
                        </span>
                      </div>
                    )}
                    
                    {/* Last sync info */}
                    {syncStatuses[shop.id].lastSync && (
                      <div className="text-xs text-gray-400 pt-1 border-t">
                        Ostatnia synchronizacja: {new Date(syncStatuses[shop.id].lastSync!.startedAt).toLocaleString()}
                        <span className={`ml-2 px-1 py-0.5 rounded text-xs ${
                          syncStatuses[shop.id].lastSync!.status === 'SUCCESS' 
                            ? 'bg-green-100 text-green-800'
                            : syncStatuses[shop.id].lastSync!.status === 'ERROR'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {syncStatuses[shop.id].lastSync!.status}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs sm:text-sm text-gray-500">
                    Zamówienia: {shop._count?.orders || 0}
                  </p>
                )}
                
                <p className="text-xs sm:text-sm text-gray-500">
                  Dodany: {new Date(shop.createdAt).toLocaleDateString()}
                </p>
              </div>

              <div className="flex flex-col space-y-1.5 sm:space-y-2">
                <div className="flex space-x-1.5 sm:space-x-2">
                  <button
                    onClick={() => syncShop(shop.id)}
                    className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors"
                  >
                    <span className="hidden sm:inline">Synchronizuj</span>
                    <span className="sm:hidden">Sync</span>
                  </button>
                  <button
                    onClick={() => testShopConnection(shop.id)}
                    className="flex-1 bg-purple-50 hover:bg-purple-100 text-purple-700 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors"
                  >
                    Test
                  </button>
                </div>
                <div className="flex space-x-1.5 sm:space-x-2">
                  <button
                    onClick={() => handleEdit(shop)}
                    className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors"
                  >
                    Edytuj
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(shop.id)}
                    className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors"
                  >
                    Usuń
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {shops.length === 0 && !loading && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Brak sklepów</h3>
            <p className="mt-1 text-sm text-gray-500">Zacznij od dodania pierwszego sklepu.</p>
          </div>
        )}
      </div>

      {/* Add Shop Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">
                {editingShop ? 'Edytuj sklep' : 'Dodaj nowy sklep'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false)
                  setEditingShop(null)
                  setFormData({
                    name: '',
                    platform: 'woocommerce',
                    url: '',
                    apiKey: '',
                    apiSecret: ''
                  })
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nazwa sklepu</label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Platforma</label>
                <select
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  value={formData.platform}
                  onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                >
                  <option value="woocommerce">WooCommerce</option>
                  <option value="shopify">Shopify</option>
                  <option value="custom">Własne API</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">URL sklepu</label>
                <input
                  type="url"
                  required
                  placeholder="https://twojsklep.com"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Klucz API / Consumer Key</label>
                <input
                  type="text"
                  required={!editingShop}
                  placeholder={editingShop ? 'Pozostaw puste aby nie zmieniać' : ''}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Sekret API / Consumer Secret</label>
                <input
                  type="password"
                  required={!editingShop}
                  placeholder={editingShop ? 'Pozostaw puste aby nie zmieniać' : ''}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  value={formData.apiSecret}
                  onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-md text-sm font-medium transition-colors"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md text-sm font-medium transition-colors"
                >
                  {editingShop ? 'Zapisz zmiany' : 'Dodaj sklep'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <svg className="w-12 h-12 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Usuń sklep</h3>
                <p className="text-sm text-gray-500">
                  Czy na pewno chcesz usunąć ten sklep? Tej operacji nie można cofnąć.
                  {shops.find(s => s.id === showDeleteConfirm)?._count?.orders ? 
                    ` Sklep ma ${shops.find(s => s.id === showDeleteConfirm)?._count?.orders} zamówień.` : ''}
                </p>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-md text-sm font-medium transition-colors"
              >
                Anuluj
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md text-sm font-medium transition-colors"
              >
                Usuń sklep
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}