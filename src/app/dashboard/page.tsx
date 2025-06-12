'use client'

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { useNotifications } from '@/lib/notification-context'
import { createInventoryNotifications } from '@/lib/inventory-monitor'
import OrderFilters from '@/components/OrderFilters'
import ExportButton from '@/components/ExportButton'
import SearchInput from '@/components/SearchInput'
import Pagination from '@/components/Pagination'
import DashboardCharts from '@/components/DashboardCharts'
import { 
  ChartBarIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  TruckIcon,
  ShoppingBagIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline'

interface Order {
  id: string
  externalId: string
  customerName: string
  customerEmail: string
  status: string
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
  }[]
}

interface DashboardStats {
  total: number
  new: number
  processing: number
  shipped: number
  revenue: number
  avgOrderValue: number
  todayOrders: number
  conversionRate: number
  revenueGrowth?: number
  orderGrowth?: number
}

interface AnalyticsData {
  ordersByDay: Array<{ date: string; count: number; revenue: number }>
  ordersByStatus: Array<{ status: string; count: number }>
  ordersByShop: Array<{ shop: string; count: number; revenue: number }>
  revenueByDay: Array<{ date: string; revenue: number }>
  metrics: {
    totalOrders: number
    totalRevenue: number
    avgOrderValue: number
    conversionRate: number
    revenueGrowth: number
    orderGrowth: number
  }
}

export default function Dashboard() {
  const { createSyncNotification, createInventoryNotification } = useNotifications()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [shops, setShops] = useState<{ id: string; name: string }[]>([])
  const [filters, setFilters] = useState<any>({
    status: 'NEW,PROCESSING',
    days: '30' // Default to last 30 days
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 1,
    limit: 20
  })
  const ITEMS_PER_PAGE = 20
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    new: 0,
    processing: 0,
    shipped: 0,
    revenue: 0,
    avgOrderValue: 0,
    todayOrders: 0,
    conversionRate: 0
  })
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)

  useEffect(() => {
    fetchOrders()
    fetchShops()
    fetchAnalytics()
  }, [filters, searchQuery, currentPage])

  // Auto-sync orders every 10 minutes and check inventory every 30 minutes
  useEffect(() => {
    const autoSyncInterval = setInterval(() => {
      console.log('🔄 Auto-sync: Checking for new orders...')
      syncAllOrders(true) // Silent mode
    }, 10 * 60 * 1000) // 10 minutes

    const inventoryCheckInterval = setInterval(async () => {
      console.log('📦 Auto-check: Monitoring inventory levels...')
      await createInventoryNotifications(createInventoryNotification)
    }, 30 * 60 * 1000) // 30 minutes

    // Initial inventory check after 2 minutes
    const initialInventoryCheck = setTimeout(async () => {
      await createInventoryNotifications(createInventoryNotification)
    }, 2 * 60 * 1000)

    // Cleanup intervals on component unmount
    return () => {
      clearInterval(autoSyncInterval)
      clearInterval(inventoryCheckInterval)
      clearTimeout(initialInventoryCheck)
    }
  }, [createInventoryNotification])

  const fetchOrders = async () => {
    try {
      console.log('Fetching orders for page:', currentPage)
      const params = new URLSearchParams({ 
        limit: ITEMS_PER_PAGE.toString(),
        page: currentPage.toString()
      })
      if (filters.status) params.append('status', filters.status)
      if (filters.shopId) params.append('shopId', filters.shopId)
      if (filters.days) params.append('days', filters.days)
      if (searchQuery) params.append('search', searchQuery)
      
      const response = await fetch(`/api/orders?${params}`)
      const data = await response.json()
      console.log('API response pagination:', data.pagination)
      setOrders(data.orders || [])
      setPagination(data.pagination || { total: 0, totalPages: 1, limit: ITEMS_PER_PAGE })
      
      const total = data.orders?.length || 0
      const newOrders = data.orders?.filter((o: Order) => o.status === 'NEW').length || 0
      const processing = data.orders?.filter((o: Order) => o.status === 'PROCESSING').length || 0
      const shipped = data.orders?.filter((o: Order) => o.status === 'SHIPPED').length || 0
      
      // Safe revenue calculation - ensure we're dealing with numbers
      const revenue = data.orders?.reduce((sum: number, o: Order) => {
        const amount = typeof o.totalAmount === 'string' ? parseFloat(o.totalAmount) : Number(o.totalAmount)
        return sum + (isNaN(amount) ? 0 : amount)
      }, 0) || 0
      
      const avgOrderValue = total > 0 ? revenue / total : 0
      const todayOrders = data.orders?.filter((o: Order) => 
        new Date(o.orderDate).toDateString() === new Date().toDateString()
      ).length || 0
      
      // Calculate overdue orders (more than 2 days old with NEW or PROCESSING status)
      const twoDaysAgo = new Date()
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
      const overdueOrders = data.orders?.filter((o: Order) => {
        const orderDate = new Date(o.orderDate)
        return (o.status === 'NEW' || o.status === 'PROCESSING') && orderDate < twoDaysAgo
      }).length || 0
      
      // Use analytics data for some stats, but keep revenue safe
      setStats({ 
        total: (analyticsData as any)?.totals?.totalOrders || (analyticsData as any)?.metrics?.totalOrders || total, 
        new: overdueOrders, // Show overdue orders instead of just new
        processing, 
        shipped, 
        revenue: revenue, // Use local calculation to avoid huge numbers
        avgOrderValue: avgOrderValue, // Use local calculation
        todayOrders: (analyticsData as any)?.totals?.todayOrders || todayOrders,
        conversionRate: (analyticsData as any)?.metrics?.conversionRate || 0,
        revenueGrowth: (analyticsData as any)?.metrics?.revenueGrowth,
        orderGrowth: (analyticsData as any)?.metrics?.orderGrowth
      })
    } catch (error) {
      console.error('Error fetching orders:', error)
      toast.error('Nie udało się pobrać zamówień')
    } finally {
      setLoading(false)
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

  const fetchAnalytics = async () => {
    try {
      console.log('Fetching dashboard analytics...')
      // Use the same date filter as orders
      const params = new URLSearchParams()
      if (filters.days) params.append('days', filters.days)
      
      const response = await fetch(`/api/analytics?${params}`)
      if (response.ok) {
        const data = await response.json()
        console.log('Analytics data received:', data)
        console.log('ordersByDay length:', data.ordersByDay?.length)
        console.log('revenueByDay length:', data.revenueByDay?.length)
        setAnalyticsData(data)
      } else {
        console.error('Failed to fetch analytics data, status:', response.status)
        const errorData = await response.text()
        console.error('Error response:', errorData)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
      // Don't show error toast for analytics as it's not critical for basic functionality
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

  const syncAllOrders = async (silent = false) => {
    try {
      if (!silent) {
        toast.loading('Synchronizacja zamówień...', { id: 'sync' })
      }
      
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
        
        if (!silent) {
          toast.success(`Zsynchronizowano ${totalSynced} zamówień!`, { id: 'sync' })
        } else if (totalSynced > 0) {
          // Use notification system for auto-sync
          createSyncNotification(totalSynced)
        }
        fetchOrders()
        fetchAnalytics() // Also refresh analytics
      } else {
        throw new Error('Failed to fetch shops')
      }
    } catch (error) {
      if (!silent) {
        toast.error('Nie udało się zsynchronizować zamówień', { id: 'sync' })
      } else {
        console.error('Auto-sync failed:', error)
        createSyncNotification(0, true) // Error notification
      }
    }
  }

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      
      if (response.ok) {
        toast.success(`Status zamówienia zaktualizowany na ${status.toLowerCase()}`)
        fetchOrders()
      }
    } catch (error) {
      toast.error('Nie udało się zaktualizować statusu zamówienia')
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      NEW: 'bg-blue-50 text-blue-700 border-blue-200',
      PROCESSING: 'bg-amber-50 text-amber-700 border-amber-200',
      PRINTED: 'bg-purple-50 text-purple-700 border-purple-200',
      SHIPPED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      DELIVERED: 'bg-green-50 text-green-700 border-green-200',
      CANCELLED: 'bg-red-50 text-red-700 border-red-200'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-50 text-gray-700 border-gray-200'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Ładowanie dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Streamlined Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Panel główny</h1>
          <div className="flex items-center gap-4 mt-1">
            <span className="text-sm text-gray-500">
              <ClockIcon className="inline h-4 w-4 mr-1" />
              {new Date().toLocaleTimeString('pl-PL', {hour: '2-digit', minute: '2-digit'})}
            </span>
            <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
              🟢 System Online
            </span>
          </div>
        </div>
        <button 
          onClick={() => syncAllOrders()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          🔄 Synchronizuj
        </button>
      </div>

      {/* Production Workflow Status - Focus on Key Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Urgent Actions */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">🚀 Działania priorytetowe</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* High Priority Orders */}
            <div className="bg-gradient-to-br from-red-50 to-orange-50 border border-red-200 rounded-xl p-4 hover:shadow-lg transition-all">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-red-800">⚠️ Wymagają uwagi</h3>
                <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-sm font-bold">{stats.new}</span>
              </div>
              <p className="text-sm text-red-600 mb-3">Zamówienia przeterminowane (&gt;2 dni)</p>
              <button 
                onClick={() => window.location.href = '/dashboard/orders?status=NEW,PROCESSING&days=7'}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
              >
                Przejdź do zamówień
              </button>
            </div>

            {/* Production Queue */}
            <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 rounded-xl p-4 hover:shadow-lg transition-all">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-purple-800">🎨 Kolejka produkcji</h3>
                <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-sm font-bold">{stats.processing}</span>
              </div>
              <p className="text-sm text-purple-600 mb-3">Zamówienia w realizacji</p>
              <button 
                onClick={() => window.location.href = '/dashboard/production'}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
              >
                Zarządzaj produkcją
              </button>
            </div>
          </div>
        </div>

        {/* Today's Summary */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">📊 Dzisiaj</h2>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Nowe zamówienia</span>
                <span className="text-2xl font-bold text-gray-900">{stats.todayOrders}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Przychód (30 dni)</span>
                <span className="text-lg font-semibold text-green-600">{Number(stats.revenue || 0).toFixed(0)} PLN</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Średnia wartość</span>
                <span className="text-sm font-medium text-gray-900">{Number(stats.avgOrderValue || 0).toFixed(0)} PLN</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions - Workflow Focused */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">⚡ Szybkie akcje</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Check Inventory */}
          <button 
            onClick={() => window.location.href = '/dashboard/inventory'}
            className="flex flex-col items-center p-6 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-lg transition-all group"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-blue-200 transition-colors">
              <span className="text-2xl">📦</span>
            </div>
            <h3 className="font-semibold text-gray-900 text-center">Sprawdź magazyn</h3>
            <p className="text-sm text-gray-500 text-center mt-1">Kontrola zapasów</p>
          </button>

          {/* View Analytics */}
          <button 
            onClick={() => window.location.href = '/dashboard/analytics'}
            className="flex flex-col items-center p-6 bg-white border border-gray-200 rounded-xl hover:border-green-300 hover:shadow-lg transition-all group"
          >
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-green-200 transition-colors">
              <span className="text-2xl">📊</span>
            </div>
            <h3 className="font-semibold text-gray-900 text-center">Analityka</h3>
            <p className="text-sm text-gray-500 text-center mt-1">Raporty sprzedaży</p>
          </button>

          {/* Manage Shops */}
          <button 
            onClick={() => window.location.href = '/dashboard/shops'}
            className="flex flex-col items-center p-6 bg-white border border-gray-200 rounded-xl hover:border-purple-300 hover:shadow-lg transition-all group"
          >
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-purple-200 transition-colors">
              <span className="text-2xl">🏪</span>
            </div>
            <h3 className="font-semibold text-gray-900 text-center">Zarządzaj sklepami</h3>
            <p className="text-sm text-gray-500 text-center mt-1">Konfiguracja</p>
          </button>

          {/* Shipping */}
          <button 
            onClick={() => window.location.href = '/dashboard/shipping'}
            className="flex flex-col items-center p-6 bg-white border border-gray-200 rounded-xl hover:border-orange-300 hover:shadow-lg transition-all group"
          >
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-orange-200 transition-colors">
              <span className="text-2xl">🚚</span>
            </div>
            <h3 className="font-semibold text-gray-900 text-center">Wysyłka</h3>
            <p className="text-sm text-gray-500 text-center mt-1">Zarządzaj przesyłkami</p>
          </button>
        </div>
      </div>

      {/* Compact Analytics Overview */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">📈 Przegląd analityczny</h2>
          <button 
            onClick={() => window.location.href = '/dashboard/analytics'}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Zobacz szczegóły →
          </button>
        </div>
        
        {analyticsData ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <DashboardCharts 
              ordersByDay={analyticsData.ordersByDay}
              ordersByStatus={analyticsData.ordersByStatus}
              ordersByShop={analyticsData.ordersByShop}
              revenueByDay={analyticsData.revenueByDay}
            />
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-500">Ładowanie analityki...</p>
          </div>
        )}
      </div>

      {/* Recent Orders - Simplified */}
      {orders.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">📋 Ostatnie zamówienia</h2>
            <button 
              onClick={() => window.location.href = '/dashboard/orders'}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Zobacz wszystkie →
            </button>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="divide-y divide-gray-200">
              {orders.slice(0, 5).map((order) => (
                <div 
                  key={order.id} 
                  className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => window.location.href = `/dashboard/orders/${order.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-700">#{order.externalId.slice(-3)}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{order.customerName}</p>
                        <p className="text-sm text-gray-500">{order.shop?.name || 'Unknown Shop'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{Number(order.totalAmount).toFixed(0)} PLN</p>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status === 'NEW' ? 'Nowe' :
                         order.status === 'PROCESSING' ? 'W realizacji' :
                         order.status === 'SHIPPED' ? 'Wysłane' : order.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}