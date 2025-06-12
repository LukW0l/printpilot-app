'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { useNotifications } from '@/lib/notification-context'
import OrderFilters from '@/components/OrderFilters'
import ExportButton from '@/components/ExportButton'
import SearchInput from '@/components/SearchInput'
import Pagination from '@/components/Pagination'
import BulkActionsBar from '@/components/BulkActionsBar'
import KanbanBoard from '@/components/KanbanBoard'
import { 
  ShoppingBagIcon,
  ClockIcon,
  CogIcon,
  TruckIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  ArrowTopRightOnSquareIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'

interface Order {
  id: string
  externalId: string
  customerName: string
  customerEmail: string
  status: string
  paymentStatus: string
  totalAmount: number
  currency: string
  orderDate: string
  shop: {
    name: string
    platform: string
  }
  items: {
    name: string
    quantity: number
    price: number
    completedCount?: number
    completionStatus?: string
  }[]
}

function OrdersPageContent() {
  const { createSyncNotification } = useNotifications()
  const searchParams = useSearchParams()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [shops, setShops] = useState<{ id: string; name: string }[]>([])
  const [filters, setFilters] = useState<any>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 1,
    limit: 20
  })
  const [dateRange, setDateRange] = useState<any>(null)
  const [viewMode, setViewMode] = useState<'table' | 'cards' | 'kanban'>('table')
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [showAdvancedActions, setShowAdvancedActions] = useState(false)
  const ITEMS_PER_PAGE = 20
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    processing: 0,
    printed: 0,
    shipped: 0,
    revenue: 0,
    delivered: 0,
    todayOrders: 0,
    thisWeekOrders: 0,
    production: {
      printed: 0,
      printing: 0,
      notPrinted: 0,
      total: 0
    }
  })

  // Initialize search query from URL parameters
  useEffect(() => {
    const searchFromUrl = searchParams.get('search')
    if (searchFromUrl) {
      setSearchQuery(searchFromUrl)
    }
  }, [searchParams])

  useEffect(() => {
    fetchOrders()
    fetchShops()
    fetchStats()
  }, [filters, searchQuery, currentPage])

  // Auto-sync orders every 10 minutes
  useEffect(() => {
    const autoSyncInterval = setInterval(() => {
      console.log('🔄 Auto-sync: Checking for new orders on orders page...')
      syncAllOrders()
    }, 10 * 60 * 1000) // 10 minutes

    return () => clearInterval(autoSyncInterval)
  }, [])

  const fetchOrders = async () => {
    try {
      console.log('Fetching orders for page:', currentPage)
      const params = new URLSearchParams({ 
        limit: ITEMS_PER_PAGE.toString(),
        page: currentPage.toString()
      })
      
      // Apply filters
      if (filters.status) params.append('status', filters.status)
      if (filters.shopId) params.append('shopId', filters.shopId)
      if (searchQuery) params.append('search', searchQuery)
      
      // Apply date filters
      if (filters.days) params.append('days', filters.days)
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.append('dateTo', filters.dateTo)
      if (filters.all) params.append('all', filters.all)
      
      const response = await fetch(`/api/orders?${params}`)
      const data = await response.json()
      console.log('API response:', data)
      setOrders(data.orders || [])
      setPagination(data.pagination || { total: 0, totalPages: 1, limit: ITEMS_PER_PAGE })
      setDateRange(data.dateRange || null)
    } catch (error) {
      console.error('Error fetching orders:', error)
      toast.error('Nie udało się pobrać zamówień')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      // Pass current filters to stats API
      const params = new URLSearchParams()
      if (filters.days) params.append('days', filters.days)
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.append('dateTo', filters.dateTo)
      if (filters.all) params.append('all', filters.all)
      if (filters.status) params.append('status', filters.status)
      if (filters.shopId) params.append('shopId', filters.shopId)
      
      console.log('Fetching stats with filters:', filters)
      console.log('Stats API URL:', `/api/orders/stats?${params}`)
      
      const response = await fetch(`/api/orders/stats?${params}`)
      const data = await response.json()
      
      console.log('Stats API response:', data)
      
      setStats({
        total: data.orders.total,
        new: data.orders.new,
        processing: data.orders.processing,
        printed: data.orders.printed,
        shipped: data.orders.shipped,
        delivered: data.orders.delivered,
        revenue: data.revenue.total,
        todayOrders: data.orders.todayOrders,
        thisWeekOrders: data.orders.thisWeekOrders,
        production: data.production
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const fetchShops = async () => {
    try {
      const response = await fetch('/api/shops')
      const data = await response.json()
      setShops(data.shops || [])
    } catch (error) {
      console.error('Error fetching shops:', error)
      toast.error('Nie udało się pobrać sklepów')
    }
  }

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
    setCurrentPage(1)
  }, [])

  const handlePageChange = useCallback((page: number) => {
    console.log('Changing to page:', page)
    setCurrentPage(page)
  }, [])

  const handleBulkAction = async (action: string, data?: any) => {
    try {
      switch (action) {
        case 'updateStatus':
          await Promise.all(selectedOrders.map(orderId => 
            fetch(`/api/orders/${orderId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: data.status })
            })
          ))
          fetchOrders()
          break
        
        case 'assignOperator':
        case 'bulkPrint':
        case 'generateFrameRequirements':
        case 'export':
          const bulkResponse = await fetch('/api/orders/bulk', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              action: action,
              orderIds: selectedOrders,
              data: data
            })
          })

          if (bulkResponse.ok) {
            const bulkResult = await bulkResponse.json()
            
            // Show success message based on action
            const successMessages = {
              'assignOperator': `Przypisano ${bulkResult.result.assigned} zamówień do ${bulkResult.result.operatorName}`,
              'bulkPrint': `Oznaczono ${bulkResult.result.itemsMarkedForPrinting} przedmiotów do druku`,
              'generateFrameRequirements': `Utworzono ${bulkResult.result.frameRequirementsCreated} wymagań ramowych`,
              'export': `Wyeksportowano ${bulkResult.result.ordersExported} zamówień`
            }
            
            toast.success(successMessages[action as keyof typeof successMessages] || 'Akcja wykonana pomyślnie')
            
            // Handle export differently - download file or show data
            if (action === 'export') {
              const blob = new Blob([JSON.stringify(bulkResult.result.data, null, 2)], { 
                type: 'application/json' 
              })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `orders-export-${new Date().toISOString().split('T')[0]}.json`
              a.click()
              URL.revokeObjectURL(url)
            }
          } else {
            const errorData = await bulkResponse.json()
            toast.error(errorData.error || 'Błąd podczas wykonywania akcji')
          }
          
          if (action !== 'export') {
            fetchOrders() // Refresh data for non-export actions
          }
          break
        
        case 'bulkShip':
          await handleBulkShipping()
          break
        
        case 'delete':
          const deleteResponse = await fetch('/api/orders/bulk', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              action: 'delete',
              orderIds: selectedOrders,
              data: {}
            })
          })

          if (deleteResponse.ok) {
            const deleteResult = await deleteResponse.json()
            toast.success(`Usunięto ${deleteResult.result.deleted} zamówień`)
          } else {
            const errorData = await deleteResponse.json()
            toast.error(errorData.error || 'Błąd podczas usuwania zamówień')
          }
          
          fetchOrders()
          break
      }
      setSelectedOrders([])
    } catch (error) {
      toast.error('Błąd podczas wykonywania akcji masowej')
    }
  }

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    )
  }

  const handleSelectAll = () => {
    if (selectedOrders.length === orders.length) {
      setSelectedOrders([])
    } else {
      setSelectedOrders(orders.map(order => order.id))
    }
  }

  const handleOrderMove = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      
      if (response.ok) {
        fetchOrders()
      }
    } catch (error) {
      toast.error('Nie udało się zaktualizować statusu zamówienia')
    }
  }

  const handleBulkShipping = async () => {
    try {
      // Filter orders that can be shipped (status PRINTED or PACKAGED and no tracking number)
      const shippableOrders = orders.filter(order => 
        selectedOrders.includes(order.id) && 
        (order.status === 'PRINTED' || order.status === 'PACKAGED') && 
        !(order as any).trackingNumber
      )

      if (shippableOrders.length === 0) {
        toast.error('Brak zamówień gotowych do wysłania w zaznaczeniu')
        return
      }

      if (shippableOrders.length !== selectedOrders.length) {
        const message = `Tylko ${shippableOrders.length} z ${selectedOrders.length} zamówień może być wysłanych (status: PRINTED/PACKAGED, brak śledzenia)`
        if (!confirm(`${message}. Kontynuować?`)) {
          return
        }
      }

      toast.loading(`Tworzenie przesyłek dla ${shippableOrders.length} zamówień...`, { id: 'bulk-ship' })

      let successful = 0
      let failed = 0
      const errors = []

      // Process orders sequentially to avoid API rate limits
      for (const order of shippableOrders) {
        try {
          const response = await fetch('/api/shipping/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: order.id })
          })

          if (response.ok) {
            successful++
          } else {
            const result = await response.json()
            failed++
            errors.push(`${order.externalId}: ${result.error}`)
          }
        } catch (error) {
          failed++
          errors.push(`${order.externalId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }

        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      if (successful > 0) {
        toast.success(`Utworzono ${successful} przesyłek!`, { id: 'bulk-ship' })
        fetchOrders() // Refresh to show updated tracking numbers
      }

      if (failed > 0) {
        console.error('Bulk shipping errors:', errors)
        toast.error(`${failed} przesyłek nie udało się utworzyć`, { id: 'bulk-ship' })
      }

    } catch (error) {
      console.error('Error in bulk shipping:', error)
      toast.error('Błąd podczas masowego zamawiania kuriera', { id: 'bulk-ship' })
    }
  }

  const syncAllOrders = async () => {
    try {
      toast.loading('Synchronizacja zamówień...', { id: 'sync' })
      
      // Get all shops and sync them
      const shopsResponse = await fetch('/api/shops')
      if (shopsResponse.ok) {
        const shopsData = await shopsResponse.json()
        const shops = shopsData.shops || []
        
        let totalSynced = 0
        for (const shop of shops) {
          if (shop.isActive && shop.apiKey && shop.apiSecret) {
            try {
              const syncResponse = await fetch(`/api/sync/woocommerce/${shop.id}`, {
                method: 'POST'
              })
              if (syncResponse.ok) {
                const syncResult = await syncResponse.json()
                totalSynced += syncResult.syncedOrders?.length || 0
              }
            } catch (error) {
              console.error(`Failed to sync shop ${shop.name || 'Unknown'}:`, error)
            }
          }
        }
        
        if (totalSynced > 0) {
          createSyncNotification(totalSynced)
        }
        toast.success(`Zsynchronizowano ${totalSynced} zamówień!`, { id: 'sync' })
      } else {
        throw new Error('Failed to fetch shops')
      }
      
      fetchOrders()
    } catch (error) {
      toast.error('Nie udało się zsynchronizować zamówień', { id: 'sync' })
    }
  }

  const forceStatusUpdate = async () => {
    try {
      toast.loading('Wymuszanie aktualizacji statusów...', { id: 'force-update' })
      
      const response = await fetch('/api/sync/force-status-update', {
        method: 'POST'
      })
      
      const result = await response.json()
      
      if (result.success) {
        toast.success(`Zaktualizowano ${result.totalUpdated} zamówień!`, { id: 'force-update' })
        
        // Show detailed results
        if (result.details && result.details.length > 0) {
          console.log('📊 Status update details:')
          result.details.forEach((shop: any) => {
            console.log(`🏪 ${shop.shopName}: ${shop.updatedCount} zaktualizowanych`)
            if (shop.details && shop.details.length > 0) {
              shop.details.forEach((order: any) => {
                console.log(`   📝 Zamówienie ${order.externalId}: ${order.oldStatus} → ${order.newStatus}`)
              })
            }
          })
        }
        
        fetchOrders() // Refresh to show updated statuses
      } else {
        throw new Error(result.error || 'Błąd podczas aktualizacji statusów')
      }
    } catch (error) {
      console.error('Force status update error:', error)
      toast.error('Nie udało się wymusić aktualizacji statusów', { id: 'force-update' })
    }
  }

  const checkShipmentStatuses = async () => {
    try {
      toast.loading('Sprawdzanie statusów przesyłek w API...', { id: 'check-shipments' })
      
      const response = await fetch('/api/shipping/status', {
        method: 'GET'
      })
      
      const result = await response.json()
      
      if (result.success) {
        toast.success(`Sprawdzono ${result.checked} przesyłek, zaktualizowano ${result.updated}`, { id: 'check-shipments' })
        
        if (result.results && result.results.length > 0) {
          console.log('📦 Shipping status updates:')
          result.results.forEach((order: any) => {
            console.log(`📝 ${order.externalId}: ${order.previousStatus} → ${order.newStatus} (Apaczka: ${order.apaczkaStatus})`)
          })
        }
        
        fetchOrders() // Refresh to show updated statuses
      } else {
        throw new Error(result.error || 'Błąd podczas sprawdzania statusów')
      }
    } catch (error) {
      console.error('Check shipment statuses error:', error)
      toast.error('Nie udało się sprawdzić statusów przesyłek', { id: 'check-shipments' })
    }
  }

  const syncPrintStatus = async () => {
    try {
      toast.loading('Synchronizacja statusów druku...', { id: 'sync-print' })
      
      const response = await fetch('/api/orders/sync-print-status', {
        method: 'POST'
      })
      
      const result = await response.json()
      
      if (result.success) {
        toast.success(`Zsynchronizowano ${result.updatedItems} elementów`, { id: 'sync-print' })
        
        console.log(`🔄 Print status sync completed: ${result.updatedItems} items updated across ${result.checkedOrders} orders`)
        
        fetchOrders() // Refresh to show updated statuses
        fetchStats() // Refresh stats to reflect changes
      } else {
        throw new Error(result.error || 'Błąd podczas synchronizacji statusów druku')
      }
    } catch (error) {
      console.error('Sync print status error:', error)
      toast.error('Nie udało się zsynchronizować statusów druku', { id: 'sync-print' })
    }
  }

  const getStatusConfig = (status: string) => {
    const configs = {
      NEW: { 
        color: 'bg-blue-50 text-blue-700 border-blue-200', 
        icon: ExclamationTriangleIcon,
        label: 'Nowe'
      },
      PROCESSING: { 
        color: 'bg-amber-50 text-amber-700 border-amber-200', 
        icon: CogIcon,
        label: 'W realizacji'
      },
      PRINTED: { 
        color: 'bg-purple-50 text-purple-700 border-purple-200', 
        icon: CheckCircleIcon,
        label: 'Wydrukowane'
      },
      PACKAGED: { 
        color: 'bg-orange-50 text-orange-700 border-orange-200', 
        icon: ShoppingBagIcon,
        label: 'Spakowane'
      },
      SHIPPED: { 
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200', 
        icon: TruckIcon,
        label: 'Wysłane'
      },
      DELIVERED: { 
        color: 'bg-green-50 text-green-700 border-green-200', 
        icon: CheckCircleIcon,
        label: 'Dostarczone'
      },
      CANCELLED: { 
        color: 'bg-red-50 text-red-700 border-red-200', 
        icon: ExclamationTriangleIcon,
        label: 'Anulowane'
      }
    }
    return configs[status as keyof typeof configs] || configs.NEW
  }

  const getPaymentStatusConfig = (paymentStatus: string) => {
    const configs = {
      PENDING: { 
        color: 'bg-gray-50 text-gray-700 border-gray-200', 
        label: 'Oczekuje płatności'
      },
      PAID: { 
        color: 'bg-green-50 text-green-700 border-green-200', 
        label: 'Opłacone'
      },
      COD: { 
        color: 'bg-blue-50 text-blue-700 border-blue-200', 
        label: 'Pobranie'
      },
      FAILED: { 
        color: 'bg-red-50 text-red-700 border-red-200', 
        label: 'Błąd płatności'
      },
      REFUNDED: { 
        color: 'bg-purple-50 text-purple-700 border-purple-200', 
        label: 'Zwrócone'
      },
      CANCELLED: { 
        color: 'bg-red-50 text-red-700 border-red-200', 
        label: 'Anulowane'
      }
    }
    return configs[paymentStatus as keyof typeof configs] || configs.PENDING
  }

  const getPriorityLevel = (order: Order) => {
    const orderDate = new Date(order.orderDate)
    const daysSinceOrder = Math.floor((Date.now() - orderDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (order.status === 'NEW' && daysSinceOrder > 2) return 'high'
    if (order.status === 'PROCESSING' && daysSinceOrder > 5) return 'high'
    if (daysSinceOrder > 1) return 'medium'
    return 'low'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Ładowanie zamówień...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Streamlined Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Zamówienia</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-sm text-gray-500">
              <ClockIcon className="inline h-4 w-4 mr-1" />
              {new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
              {pagination.total} zamówień
            </span>
            {dateRange && dateRange.isDefault && (
              <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                📅 30 dni
              </span>
            )}
          </div>
        </div>
        
        {/* Primary Actions */}
        <div className="flex gap-2">
          <button 
            onClick={syncAllOrders}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            🔄 Synchronizuj
          </button>
          <div className="relative">
            <button 
              onClick={() => setShowAdvancedActions(!showAdvancedActions)}
              className="px-4 py-2 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors"
            >
              ⚡ Więcej akcji
            </button>
            
            {showAdvancedActions && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                <div className="p-2 space-y-1">
                  <button 
                    onClick={() => { forceStatusUpdate(); setShowAdvancedActions(false); }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                  >
                    ⚡ Wymuś aktualizację statusów
                  </button>
                  <button 
                    onClick={() => { checkShipmentStatuses(); setShowAdvancedActions(false); }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                  >
                    📦 Sprawdź statusy przesyłek
                  </button>
                  <button 
                    onClick={() => { syncPrintStatus(); setShowAdvancedActions(false); }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                  >
                    🔄 Synchronizuj statusy druku
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Workflow Status Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Urgent - Needs Action */}
        <div className="bg-gradient-to-br from-red-50 to-orange-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-red-800">⚠️ Wymagają akcji</h3>
            <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-sm font-bold">{stats.new}</span>
          </div>
          <p className="text-sm text-red-600 mb-3">Nowe zamówienia do przetworzenia</p>
          <button 
            onClick={() => window.location.href = '/dashboard/orders?status=NEW'}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
          >
            Przetwórz nowe
          </button>
        </div>

        {/* In Progress */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-blue-800">🔄 W realizacji</h3>
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-bold">{stats.processing}</span>
          </div>
          <p className="text-sm text-blue-600 mb-3">Zamówienia w trakcie produkcji</p>
          <button 
            onClick={() => window.location.href = '/dashboard/production'}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
          >
            Zobacz produkcję
          </button>
        </div>

        {/* Ready to Ship */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-green-800">📦 Gotowe do wysyłki</h3>
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm font-bold">{stats.printed}</span>
          </div>
          <p className="text-sm text-green-600 mb-3">Wydrukowane, do spakowania</p>
          <button 
            onClick={() => window.location.href = '/dashboard/shipping'}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
          >
            Zarządzaj wysyłką
          </button>
        </div>

        {/* Today's Summary */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 mb-1">{stats.todayOrders}</div>
            <p className="text-sm text-gray-600 mb-2">Dzisiejsze zamówienia</p>
            <div className="text-lg font-semibold text-green-600">{Number(stats.revenue || 0).toFixed(0)} PLN</div>
            <p className="text-xs text-gray-500">Przychód (30 dni)</p>
          </div>
        </div>
      </div>

      {/* Quick Search and Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <SearchInput 
              onSearch={handleSearch}
              placeholder="Szukaj zamówień po ID, nazwie klienta..."
              value={searchQuery}
            />
          </div>
          <div className="flex gap-2">
            <OrderFilters onFilterChange={setFilters} shops={shops} dateRange={dateRange} />
            <ExportButton filters={filters} />
          </div>
        </div>
      </div>

      {/* Bulk Actions & View Toggle */}
      {selectedOrders.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-800">
              Zaznaczono {selectedOrders.length} zamówień
            </span>
            <div className="flex gap-2">
              <BulkActionsBar
                selectedItems={selectedOrders}
                onClearSelection={() => setSelectedOrders([])}
                onBulkAction={handleBulkAction}
                totalItems={orders.length}
              />
            </div>
          </div>
        </div>
      )}

      {/* View Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-sm font-medium text-gray-700">Widok:</span>
          <div className="flex rounded-lg border border-gray-200 p-1 bg-white">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'table'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Tabela
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'cards'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Karty
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Kanban
            </button>
          </div>
        </div>
        
        <div className="text-sm text-gray-500">
          {pagination.total} zamówień • Strona {pagination.totalPages > 0 ? currentPage : 0} z {pagination.totalPages}
        </div>
      </div>

      {/* Orders Content */}
      {viewMode === 'kanban' ? (
        <KanbanBoard 
          orders={orders.map(order => ({
            ...order,
            priority: getPriorityLevel(order) as 'low' | 'medium' | 'high'
          }))}
          onOrderMove={handleOrderMove}
        />
      ) : viewMode === 'table' ? (
        <div className="bg-white rounded-lg sm:rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-shadow duration-300">
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-white border-b border-gray-200">
                <tr>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-12">
                    <input
                      type="checkbox"
                      checked={selectedOrders.length === orders.length && orders.length > 0}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Zamówienie
                  </th>
                  <th className="hidden md:table-cell px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Klient
                  </th>
                  <th className="hidden lg:table-cell px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Sklep
                  </th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="hidden sm:table-cell px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Płatność
                  </th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Wartość
                  </th>
                  <th className="hidden sm:table-cell px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Akcje
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order) => {
                  const statusConfig = getStatusConfig(order.status)
                  const priority = getPriorityLevel(order)
                  const StatusIcon = statusConfig.icon
                  
                  return (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <input
                          type="checkbox"
                          checked={selectedOrders.includes(order.id)}
                          onChange={() => handleSelectOrder(order.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10">
                            <div className={`h-8 w-8 sm:h-10 sm:w-10 rounded-lg flex items-center justify-center transition-colors ${
                              priority === 'high' 
                                ? 'bg-gradient-to-br from-red-100 to-red-200 group-hover:from-red-200 group-hover:to-red-300' 
                                : 'bg-gradient-to-br from-blue-100 to-blue-200 group-hover:from-blue-200 group-hover:to-blue-300'
                            }`}>
                              <span className={`text-xs sm:text-sm font-medium ${
                                priority === 'high' ? 'text-red-700' : 'text-blue-700'
                              }`}>#{order.externalId.slice(-3)}</span>
                            </div>
                          </div>
                          <div className="ml-2 sm:ml-4">
                            <div 
                              className="text-xs sm:text-sm font-semibold text-gray-900 hover:text-blue-600 hover:underline cursor-pointer transition-colors"
                              onClick={() => window.location.href = `/dashboard/orders/${order.id}`}
                            >
                              #{order.externalId}
                            </div>
                            {(() => {
                              const totalCompleted = order.items?.reduce((sum, item) => sum + (item.completedCount || 0), 0) || 0
                              const totalQuantity = order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0
                              if (totalCompleted > 0 && totalQuantity > 0) {
                                return (
                                  <div className="text-xs text-orange-600 font-medium">
                                    {totalCompleted}/{totalQuantity} ukończono
                                  </div>
                                )
                              }
                              return null
                            })()}
                            <div className="md:hidden text-xs text-gray-500 mt-0.5">{order.customerName}</div>
                          </div>
                        </div>
                      </td>
                      <td className="hidden md:table-cell px-3 sm:px-6 py-3 sm:py-4">
                        <div 
                          className="cursor-pointer group/customer"
                          onClick={() => window.location.href = `/dashboard/orders/${order.id}`}
                        >
                          <div className="text-xs sm:text-sm font-medium text-gray-900 group-hover/customer:text-blue-600 group-hover/customer:underline transition-colors">{order.customerName}</div>
                          <div className="text-xs sm:text-sm text-gray-500">{order.customerEmail}</div>
                        </div>
                      </td>
                      <td className="hidden lg:table-cell px-3 sm:px-6 py-3 sm:py-4">
                        <div className="text-xs sm:text-sm font-medium text-gray-900">{order.shops?.name || 'Unknown Shop'}</div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <span className={`inline-flex items-center px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}>
                          <StatusIcon className="w-3 h-3 mr-1 sm:mr-1.5" />
                          <span className="hidden sm:inline">{statusConfig.label}</span>
                          <span className="sm:hidden">{statusConfig.label.substring(0, 3)}</span>
                        </span>
                      </td>
                      <td className="hidden sm:table-cell px-3 sm:px-6 py-3 sm:py-4">
                        {(() => {
                          const paymentConfig = getPaymentStatusConfig(order.paymentStatus)
                          return (
                            <span className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium border ${paymentConfig.color}`}>
                              {paymentConfig.label}
                            </span>
                          )
                        })()}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <div className="text-xs sm:text-sm font-semibold text-gray-900">
                          {Number(order.totalAmount).toFixed(0)} <span className="text-xs">{order.currency}</span>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-500">
                        {new Date(order.orderDate).toLocaleDateString('pl-PL')}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-right">
                        <button
                          onClick={() => window.location.href = `/dashboard/orders/${order.id}`}
                          className="inline-flex items-center p-1.5 sm:p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          {orders.map((order) => {
            const statusConfig = getStatusConfig(order.status)
            const priority = getPriorityLevel(order)
            const StatusIcon = statusConfig.icon
            
            return (
              <div key={order.id} className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-xl hover:border-indigo-200 transition-all duration-300 cursor-pointer transform hover:-translate-y-1 group"
                   onClick={() => window.location.href = `/dashboard/orders/${order.id}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                      priority === 'high' 
                        ? 'bg-gradient-to-br from-red-100 to-red-200' 
                        : 'bg-gradient-to-br from-blue-100 to-blue-200'
                    }`}>
                      <span className={`text-xs font-medium ${
                        priority === 'high' ? 'text-red-700' : 'text-blue-700'
                      }`}>#{order.externalId.slice(-3)}</span>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {statusConfig.label}
                  </span>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">#{order.externalId}</h3>
                    {(() => {
                      const totalCompleted = order.items?.reduce((sum, item) => sum + (item.completedCount || 0), 0) || 0
                      const totalQuantity = order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0
                      if (totalCompleted > 0 && totalQuantity > 0) {
                        return (
                          <div className="text-xs text-orange-600 font-medium mt-1">
                            Postęp: {totalCompleted}/{totalQuantity} sztuk
                          </div>
                        )
                      }
                      return null
                    })()}
                    {(() => {
                      const paymentConfig = getPaymentStatusConfig(order.paymentStatus)
                      return (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ml-2 ${paymentConfig.color}`}>
                          {paymentConfig.label}
                        </span>
                      )
                    })()}
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-900">{order.customerName}</p>
                    <p className="text-sm text-gray-500">{order.customerEmail}</p>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">{order.shops?.name || 'Unknown Shop'}</span>
                  </div>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="text-sm font-semibold text-gray-900">
                      {Number(order.totalAmount).toFixed(2)} {order.currency}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(order.orderDate).toLocaleDateString('pl-PL')}
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 flex justify-end">
                  <ArrowTopRightOnSquareIcon className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {orders.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <div className="mx-auto h-24 w-24 text-6xl mb-6">📦</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Brak zamówień do wyświetlenia</h3>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto">
            Dodaj swój pierwszy sklep i zsynchronizuj zamówienia, aby zacząć zarządzać produkcją.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button 
              onClick={() => window.location.href = '/dashboard/shops'}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Dodaj sklep
            </button>
            <button 
              onClick={syncAllOrders}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors"
            >
              Synchronizuj zamówienia
            </button>
          </div>
        </div>
      )}

      <Pagination
        currentPage={currentPage}
        totalPages={pagination.totalPages}
        onPageChange={handlePageChange}
        totalItems={pagination.total}
        itemsPerPage={ITEMS_PER_PAGE}
      />
    </div>
  )
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OrdersPageContent />
    </Suspense>
  )
}