'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import toast from 'react-hot-toast'
import { formStyles } from '@/styles/colors'
import { 
  PrinterIcon,
  ClockIcon,
  CheckCircleIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  CogIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  Squares2X2Icon
} from '@heroicons/react/24/outline'

interface ProductionItem {
  id: string
  orderId: string
  orderExternalId: string
  name: string
  imageUrl: string
  quantity: number
  dimensions: string
  productType: string
  orderStatus: string
  printStatus: string
  priority: 'low' | 'medium' | 'high'
  estimatedTime: number // in minutes
  orderItemsCount?: number // liczba elementów w tym zamówieniu
  orderItemIndex?: number // pozycja tego elementu w zamówieniu (1-based)
}

interface ProductionBatch {
  id: string
  name: string
  items: ProductionItem[]
  status: 'pending' | 'in_progress' | 'completed'
  startTime?: Date
  estimatedCompletion?: Date
}

const ORDER_COLORS = [
  { border: 'border-l-blue-500', bg: 'bg-blue-50' },
  { border: 'border-l-green-500', bg: 'bg-green-50' },
  { border: 'border-l-purple-500', bg: 'bg-purple-50' },
  { border: 'border-l-yellow-500', bg: 'bg-yellow-50' },
  { border: 'border-l-pink-500', bg: 'bg-pink-50' },
  { border: 'border-l-indigo-500', bg: 'bg-indigo-50' },
  { border: 'border-l-orange-500', bg: 'bg-orange-50' },
  { border: 'border-l-teal-500', bg: 'bg-teal-50' }
]

export default function ProductionPage() {
  const [items, setItems] = useState<ProductionItem[]>([])
  const [allItems, setAllItems] = useState<ProductionItem[]>([]) // Wszystkie elementy do statystyk
  const [batches, setBatches] = useState<ProductionBatch[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedType, setSelectedType] = useState('all')
  const [selectedSize, setSelectedSize] = useState('all')
  const [viewMode, setViewMode] = useState<'table' | 'grid' | 'batches'>('table')
  const [activeQueue, setActiveQueue] = useState<string | null>(null)
  const [availableTypes, setAvailableTypes] = useState<string[]>([])
  const [availableSizes, setAvailableSizes] = useState<string[]>([])
  const [groupByOrder, setGroupByOrder] = useState(false)
  const [orderColors, setOrderColors] = useState<{ [orderId: string]: { border: string, bg: string } }>({})
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    fetchProductionItems()
  }, [selectedType, selectedSize, groupByOrder])

  // Auto-refresh every 10 seconds to keep production queue up to date
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('🔄 Auto-refresh: Updating production queue...')
      fetchProductionItems()
    }, 10000) // 10 seconds for testing

    return () => clearInterval(interval)
  }, [selectedType, selectedSize, groupByOrder]) // Include dependencies so refresh uses current filters

  const extractDimensionsFromName = (name: string): string | null => {
    // Szuka wzorca liczba x liczba w nazwie produktu
    const match = name.match(/(\d+)\s*x\s*(\d+)/i)
    if (match) {
      return `${match[1]}x${match[2]}cm`
    }
    return null
  }

  const generateOrderColors = (items: ProductionItem[]) => {
    const uniqueOrderIds = [...new Set(items.map(item => item.orderId))]
    const colorMap: { [orderId: string]: { border: string, bg: string } } = {}
    
    uniqueOrderIds.forEach((orderId, index) => {
      colorMap[orderId] = ORDER_COLORS[index % ORDER_COLORS.length]
    })
    
    setOrderColors(colorMap)
  }

  const enrichItemsWithOrderData = (items: ProductionItem[]): ProductionItem[] => {
    const orderGroups = items.reduce((acc, item) => {
      if (!acc[item.orderId]) acc[item.orderId] = []
      acc[item.orderId].push(item)
      return acc
    }, {} as Record<string, ProductionItem[]>)

    return items.map(item => {
      const orderItems = orderGroups[item.orderId]
      const orderItemIndex = orderItems.findIndex(oi => oi.id === item.id) + 1
      
      return {
        ...item,
        orderItemsCount: orderItems.length,
        orderItemIndex
      }
    })
  }

  const getRowClassName = (item: ProductionItem, groupByOrder: boolean) => {
    const baseClasses = 'hover:bg-gray-50 transition-colors border-l-4'
    
    if (groupByOrder && orderColors[item.orderId]) {
      // Gdy grupowanie włączone: tło zamówienia + border priorytetu
      const priorityBorder = getPriorityBorderColor(item.priority)
      return `${baseClasses} ${priorityBorder} ${orderColors[item.orderId].bg}`
    }
    
    return `${baseClasses} ${getPriorityColor(item.priority)}`
  }

  const fetchProductionItems = async () => {
    console.log('🔄 fetchProductionItems: STARTED')
    try {
      const params = new URLSearchParams({
        status: 'PROCESSING,PRINTED,SHIPPED',
        limit: '100',
        days: '30'  // Same as Orders page - last 30 days
      })
      
      const url = `/api/orders?${params}`
      console.log('🔄 fetchProductionItems: Fetching from', url)
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      console.log('📊 Production Queue API Response:', {
        orders: data.orders?.length,
        totalItems: data.orders?.reduce((sum: number, order: any) => sum + (order.items?.length || 0), 0)
      })
      
      // Extract all items from orders and add mock production data
      const allProductionItems: ProductionItem[] = []
      const queueItems: ProductionItem[] = []
      
      data.orders?.forEach((order: any) => {
        order.items?.forEach((item: any, index: number) => {
          const priority = getPriorityForItem(order, item)
          const itemPrintStatus = item.printStatus || 'NOT_PRINTED'
          
          console.log(`📝 Item ${item.id}:`, {
            id: item.id,
            name: item.name?.substring(0, 30) + '...',
            printStatus_raw: item.printStatus,
            printStatus_processed: itemPrintStatus,
            orderStatus: order.status,
            hasAllExpectedFields: !!(item.id && item.name && item.hasOwnProperty('printStatus'))
          })
          
          const productionItem = {
            id: item.id || `${order.id}-${index}`,
            orderId: order.id,
            orderExternalId: order.externalId,
            name: item.name,
            imageUrl: item.imageUrl || generateProductPreview(item),
            quantity: item.quantity,
            dimensions: item.dimensions || extractDimensionsFromName(item.name) || 'Standardowy',
            productType: item.productType || 'canvas',
            orderStatus: order.status,
            printStatus: itemPrintStatus,
            priority,
            estimatedTime: getEstimatedTime(item)
          }
          
          // Add to all items for stats
          allProductionItems.push(productionItem)
          
          // Add to queue only if NOT printed yet (for production queue display)
          if (itemPrintStatus !== 'PRINTED') {
            queueItems.push(productionItem)
          }
        })
      })

      // Save all items for stats
      setAllItems(allProductionItems)
      
      // Enrich queue items with order data
      const enrichedItems = enrichItemsWithOrderData(queueItems)
      
      // Generate colors for orders
      generateOrderColors(enrichedItems)

      // Filter by type and size
      let filtered = enrichedItems
      if (selectedType !== 'all') {
        filtered = filtered.filter(item => item.productType === selectedType)
      }
      if (selectedSize !== 'all') {
        filtered = filtered.filter(item => item.dimensions === selectedSize)
      }

      // Sort by order if grouping is enabled
      if (groupByOrder) {
        filtered.sort((a, b) => {
          // Najpierw grupuj według orderId
          if (a.orderId === b.orderId) {
            return (a.orderItemIndex || 0) - (b.orderItemIndex || 0)
          }
          // Sortowanie numeryczne zamówień (wyciągnij liczby z #38498)
          const numA = parseInt(a.orderExternalId.replace(/\D/g, '')) || 0
          const numB = parseInt(b.orderExternalId.replace(/\D/g, '')) || 0
          return numB - numA // Najnowsze zamówienia na górze
        })
      }

      console.log(`📦 Production Queue Final Items: ${filtered.length} items (${allItems.length} before type/size filters)`)
      
      setItems(filtered)
      generateSmartBatches(filtered)
      
      // Extract unique types and sizes from all items (both queue and stats)
      const uniqueTypes = [...new Set(allProductionItems.map(item => item.productType))].filter(Boolean).sort()
      const uniqueSizes = [...new Set(allProductionItems.map(item => item.dimensions))].filter(Boolean).sort()
      
      setAvailableTypes(uniqueTypes)
      setAvailableSizes(uniqueSizes)
    } catch (error) {
      console.error('Error fetching production items:', error)
      toast.error('Nie udało się pobrać elementów produkcji')
    } finally {
      console.log('🔄 fetchProductionItems: COMPLETED')
      setLoading(false)
      setLastUpdated(new Date())
    }
  }

  const getPriorityForItem = (order: any, item: any): 'low' | 'medium' | 'high' => {
    const orderDate = new Date(order.orderDate)
    const daysSinceOrder = Math.floor((Date.now() - orderDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysSinceOrder > 3) return 'high'
    if (daysSinceOrder > 1) return 'medium'
    return 'low'
  }

  const generateProductPreview = (item: any): string => {
    // Generate a meaningful preview based on product type and dimensions
    const productType = item.productType || 'canvas'
    const dimensions = item.dimensions || '100x70'
    
    // If the item has no real image, generate a data URL with product info
    const canvas = document.createElement('canvas')
    canvas.width = 200
    canvas.height = 150
    const ctx = canvas.getContext('2d')!
    
    // Background color based on product type
    const colors = {
      'canvas': '#f3f4f6',    // Light gray
      'poster': '#e5e7eb',    // Slightly darker gray
      'print': '#d1d5db',     // Medium gray
      'wall-art': '#f9fafb',  // Very light gray
      'other': '#f3f4f6'      // Default
    }
    
    ctx.fillStyle = colors[productType as keyof typeof colors] || colors.other
    ctx.fillRect(0, 0, 200, 150)
    
    // Border
    ctx.strokeStyle = '#9ca3af'
    ctx.lineWidth = 2
    ctx.strokeRect(1, 1, 198, 148)
    
    // Product type icon/text
    ctx.fillStyle = '#6b7280'
    ctx.font = 'bold 16px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(productType.toUpperCase(), 100, 60)
    
    // Dimensions
    ctx.font = '14px Arial'
    ctx.fillText(dimensions, 100, 85)
    
    // Item name (truncated)
    ctx.font = '12px Arial'
    const itemName = item.name || 'Product'
    const truncatedName = itemName.length > 20 ? itemName.substring(0, 20) + '...' : itemName
    ctx.fillText(truncatedName, 100, 110)
    
    return canvas.toDataURL()
  }

  const getEstimatedTime = (item: any): number => {
    // Real estimation based on actual product specifications
    const quantity = item.quantity || 1
    
    // Parse dimensions if available
    let area = 1 // Default area in m²
    if (item.dimensions && typeof item.dimensions === 'string') {
      const match = item.dimensions.match(/(\d+)x(\d+)/)
      if (match) {
        const width = parseInt(match[1])
        const height = parseInt(match[2])
        area = (width * height) / 10000 // Convert cm² to m²
      }
    }
    
    // Base printing times (minutes per m²)
    const printingTimes = {
      'canvas': 25,     // Canvas takes longer due to texture
      'poster': 15,     // Standard poster printing
      'print': 12,      // Basic photo print
      'wall-art': 20,   // Wall art with special finishes
      'other': 15       // Default
    }
    
    const baseTimePerM2 = printingTimes[item.productType as keyof typeof printingTimes] || printingTimes.other
    const totalTime = Math.ceil(baseTimePerM2 * area * quantity)
    
    // Minimum 5 minutes per item
    return Math.max(5, totalTime)
  }

  const generateSmartBatches = (items: ProductionItem[]) => {
    // Group items by product type and size for efficient batching
    const groups: { [key: string]: ProductionItem[] } = {}
    
    items.forEach(item => {
      const key = `${item.productType}-${item.dimensions}`
      if (!groups[key]) groups[key] = []
      groups[key].push(item)
    })

    const newBatches: ProductionBatch[] = []
    let batchId = 1

    Object.entries(groups).forEach(([key, groupItems]) => {
      // Sort by priority (high first)
      const sortedItems = groupItems.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      })

      // Create batches of max 10 items each
      for (let i = 0; i < sortedItems.length; i += 10) {
        const batchItems = sortedItems.slice(i, i + 10)
        const totalTime = batchItems.reduce((sum, item) => sum + item.estimatedTime, 0)
        
        newBatches.push({
          id: `batch-${batchId++}`,
          name: `${batchItems[0].productType} ${batchItems[0].dimensions} - Seria ${Math.ceil((i + 1) / 10)}`,
          items: batchItems,
          status: 'pending',
          estimatedCompletion: new Date(Date.now() + totalTime * 60 * 1000)
        })
      }
    })

    setBatches(newBatches)
  }

  const startBatch = async (batchId: string) => {
    setBatches(prev => prev.map(batch => 
      batch.id === batchId 
        ? { ...batch, status: 'in_progress', startTime: new Date() }
        : batch
    ))
    setActiveQueue(batchId)
    toast.success('Rozpoczęto produkcję serii')
  }

  const completeBatch = async (batchId: string) => {
    const batch = batches.find(b => b.id === batchId)
    if (batch) {
      // Mark all items in batch as printed
      for (const item of batch.items) {
        await updateItemPrintStatus(item.id, 'PRINTED')
      }
      
      setBatches(prev => prev.map(b => 
        b.id === batchId 
          ? { ...b, status: 'completed' }
          : b
      ))
      
      if (activeQueue === batchId) {
        setActiveQueue(null)
      }
      
      toast.success('Seria ukończona pomyślnie!')
    }
  }

  const updateItemPrintStatus = async (itemId: string, printStatus: string) => {
    try {
      const response = await fetch(`/api/order-items/${itemId}/print-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ printStatus })
      })
      
      if (response.ok) {
        if (printStatus === 'PRINTED') {
          await generateFrameRequirement(itemId)
        }
        fetchProductionItems()
      }
    } catch (error) {
      toast.error('Nie udało się zaktualizować statusu druku')
    }
  }

  const generateFrameRequirement = async (orderItemId: string) => {
    try {
      const response = await fetch('/api/frame-requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderItemId })
      })
      
      if (response.ok) {
        toast.success('Wymagania ramki wygenerowane automatycznie')
      }
    } catch (error) {
      console.log('Frame requirement generation failed:', error)
    }
  }

  const getStatusConfig = (status: string) => {
    const configs = {
      NOT_PRINTED: { color: 'bg-gray-50 text-gray-700 border-gray-200', icon: ClockIcon, label: 'Nie wydrukowane' },
      PRINTING: { color: 'bg-blue-50 text-blue-700 border-blue-200', icon: PrinterIcon, label: 'W druku' },
      PRINTED: { color: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircleIcon, label: 'Wydrukowane' }
    }
    return configs[status as keyof typeof configs] || configs.NOT_PRINTED
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-red-400 bg-red-50'
      case 'medium': return 'border-l-amber-400 bg-amber-50'
      default: return 'border-l-blue-400 bg-blue-50'
    }
  }

  const getPriorityBorderColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-500'
      case 'medium': return 'border-yellow-500'
      default: return 'border-blue-500'
    }
  }

  const stats = {
    total: allItems.length,
    notPrinted: allItems.filter(i => i.printStatus === 'NOT_PRINTED').length,
    printing: allItems.filter(i => i.printStatus === 'PRINTING').length,
    printed: allItems.filter(i => i.printStatus === 'PRINTED').length,
    activeBatches: batches.filter(b => b.status === 'in_progress').length,
    completedBatches: batches.filter(b => b.status === 'completed').length
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Ładowanie kolejki produkcji...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Section - Printful Style */}
      <div className="bg-white border-b border-gray-200 -mx-6 -mt-6 px-6 py-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center">
              <PrinterIcon className="h-8 w-8 text-purple-600 mr-3" />
              <div>
                <h1 className="text-2xl font-semibold text-gray-900 sm:text-3xl">
                  Kolejka Produkcji
                </h1>
                <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                  <span className="flex items-center">
                    <ClockIcon className="mr-1.5 h-4 w-4" />
                    {stats.activeBatches} aktywnych serii
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    {stats.notPrinted} do druku
                  </span>
                  {lastUpdated && (
                    <span className="text-xs text-gray-400">
                      Ostatnia akt.: {lastUpdated.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 flex space-x-3 lg:mt-0 lg:ml-4">
            <button 
              onClick={() => window.location.href = '/dashboard/frames'}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <Squares2X2Icon className="w-4 h-4 mr-2" />
              Zarządzaj ramami
            </button>
            <button 
              onClick={async () => {
                console.log('🔄 Manual refresh triggered')
                toast.loading('Odświeżanie kolejki...', { id: 'manual-refresh' })
                try {
                  await fetchProductionItems()
                  toast.success('Kolejka produkcji odświeżona', { id: 'manual-refresh' })
                } catch (error) {
                  console.error('Manual refresh failed:', error)
                  toast.error('Błąd odświeżania', { id: 'manual-refresh' })
                }
              }}
              className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              🔄 Odśwież kolejkę
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 lg:gap-6">
        <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 border border-gray-200 hover:border-purple-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group">
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="flex-shrink-0 p-2 sm:p-2.5 lg:p-3 bg-purple-100 rounded-lg sm:rounded-xl shadow-lg group-hover:shadow-xl transition-shadow">
              <PrinterIcon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-purple-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Wszystkich</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500">elementów</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 border border-gray-200 hover:border-gray-300 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group">
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="flex-shrink-0 p-2 sm:p-2.5 lg:p-3 bg-gray-100 rounded-lg sm:rounded-xl shadow-lg group-hover:shadow-xl transition-shadow">
              <ClockIcon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-gray-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Nie wydruk.</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{stats.notPrinted}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 border border-gray-200 hover:border-blue-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group">
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="flex-shrink-0 p-2 sm:p-2.5 lg:p-3 bg-blue-100 rounded-lg sm:rounded-xl shadow-lg group-hover:shadow-xl transition-shadow">
              <CogIcon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">W druku</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{stats.printing}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 border border-gray-200 hover:border-green-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group">
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="flex-shrink-0 p-2 sm:p-2.5 lg:p-3 bg-green-100 rounded-lg sm:rounded-xl shadow-lg group-hover:shadow-xl transition-shadow">
              <CheckCircleIcon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-green-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Wydrukowane</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{stats.printed}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 border border-gray-200 hover:border-amber-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group">
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="flex-shrink-0 p-2 sm:p-2.5 lg:p-3 bg-amber-100 rounded-lg sm:rounded-xl shadow-lg group-hover:shadow-xl transition-shadow">
              <PlayIcon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-amber-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Akt. serie</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{stats.activeBatches}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 border border-gray-200 hover:border-emerald-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group">
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="flex-shrink-0 p-2 sm:p-2.5 lg:p-3 bg-emerald-100 rounded-lg sm:rounded-xl shadow-lg group-hover:shadow-xl transition-shadow">
              <CheckCircleIcon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Ukończ. serie</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{stats.completedBatches}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and View Mode */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className={formStyles.label}>Typ Produktu</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className={formStyles.select}
              >
                <option value="all">Wszystkie Typy</option>
                {availableTypes.map(type => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className={formStyles.label}>Rozmiar</label>
              <select
                value={selectedSize}
                onChange={(e) => setSelectedSize(e.target.value)}
                className={formStyles.select}
              >
                <option value="all">Wszystkie Rozmiary</option>
                {availableSizes.map(size => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center">
              <label className="flex items-center text-sm">
                <input
                  type="checkbox"
                  checked={groupByOrder}
                  onChange={(e) => setGroupByOrder(e.target.checked)}
                  className="mr-2 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="font-medium text-gray-700">📦 Grupuj według zamówień</span>
              </label>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium text-gray-700">Widok:</span>
            <div className="flex rounded-lg border border-gray-300 p-1">
              <button
                onClick={() => setViewMode('batches')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'batches' ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Serie
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'table' ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Tabela
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'grid' ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Siatka
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Production Content */}
      {viewMode === 'batches' ? (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Smart Serie Produkcyjne</h3>
          <div className="space-y-4">
            {batches.map((batch) => (
              <div key={batch.id} className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className={`w-4 h-4 rounded-full mr-3 ${
                      batch.status === 'completed' ? 'bg-green-400' :
                      batch.status === 'in_progress' ? 'bg-blue-400 animate-pulse' :
                      'bg-gray-300'
                    }`}></div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">{batch.name}</h4>
                      <p className="text-sm text-gray-500">
                        {batch.items.length} elementów • Czas: {Math.round(batch.items.reduce((sum, item) => sum + item.estimatedTime, 0) / 60)}h
                        {batch.estimatedCompletion && (
                          <span className="ml-2">• Ukończenie: {batch.estimatedCompletion.toLocaleTimeString('pl-PL')}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {batch.status === 'pending' && (
                      <button
                        onClick={() => startBatch(batch.id)}
                        className="inline-flex items-center px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        <PlayIcon className="w-4 h-4 mr-1" />
                        Start
                      </button>
                    )}
                    {batch.status === 'in_progress' && (
                      <button
                        onClick={() => completeBatch(batch.id)}
                        className="inline-flex items-center px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        <CheckCircleIcon className="w-4 h-4 mr-1" />
                        Ukończ
                      </button>
                    )}
                    {batch.status === 'completed' && (
                      <span className="inline-flex items-center px-3 py-2 bg-green-100 text-green-800 rounded-lg text-sm font-medium">
                        <CheckCircleIcon className="w-4 h-4 mr-1" />
                        Ukończone
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {batch.items.slice(0, 8).map((item) => {
                    const statusConfig = getStatusConfig(item.printStatus)
                    const StatusIcon = statusConfig.icon
                    
                    return (
                      <div key={item.id} className={`border border-gray-200 rounded-lg p-4 ${getPriorityColor(item.priority)}`}>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h5 className="text-sm font-medium text-gray-900 truncate">{item.name}</h5>
                            <p className="text-xs text-gray-500">#{item.orderExternalId}</p>
                          </div>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusConfig.label}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          <div>{item.dimensions} • {item.quantity}szt.</div>
                          <div>~{item.estimatedTime}min • Priorytet: {item.priority}</div>
                        </div>
                      </div>
                    )
                  })}
                  {batch.items.length > 8 && (
                    <div className="border border-gray-200 rounded-lg p-4 flex items-center justify-center bg-gray-50">
                      <span className="text-sm text-gray-500">+{batch.items.length - 8} więcej</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : viewMode === 'table' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Element</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Zamówienie</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Typ</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Rozmiar</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Ilość</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Priorytet</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Akcje</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map((item) => {
                  const statusConfig = getStatusConfig(item.printStatus)
                  const StatusIcon = statusConfig.icon
                  
                  return (
                    <tr key={item.id} className={getRowClassName(item, groupByOrder)}>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0">
                            <img 
                              src={item.imageUrl} 
                              alt={item.name}
                              className="h-10 w-10 rounded-lg object-cover border border-gray-200"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.src = generateProductPreview(item)
                              }}
                            />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 truncate max-w-48">{item.name}</div>
                            <div className="text-sm text-gray-500">~{item.estimatedTime}min</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          #{item.orderExternalId}
                          {groupByOrder && item.orderItemsCount && item.orderItemsCount > 1 && (
                            <div className="text-xs text-gray-500 mt-1">
                              📦 {item.orderItemIndex}/{item.orderItemsCount}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 capitalize">{item.productType}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{item.dimensions}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{item.quantity}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}>
                          <StatusIcon className="w-3 h-3 mr-1.5" />
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          item.priority === 'high' ? 'bg-red-100 text-red-800' :
                          item.priority === 'medium' ? 'bg-amber-100 text-amber-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {item.priority === 'high' ? '🔴 Wysoki' : item.priority === 'medium' ? '🟡 Średni' : '🔵 Niski'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end space-x-2">
                          {item.printStatus === 'NOT_PRINTED' && (
                            <button
                              onClick={() => updateItemPrintStatus(item.id, 'PRINTING')}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              Rozpocznij druk
                            </button>
                          )}
                          {item.printStatus === 'PRINTING' && (
                            <button
                              onClick={() => updateItemPrintStatus(item.id, 'PRINTED')}
                              className="text-green-600 hover:text-green-800 text-sm font-medium"
                            >
                              Oznacz jako wydrukowane
                            </button>
                          )}
                          <button
                            onClick={() => window.location.href = `/dashboard/orders/${item.orderId}`}
                            className="text-gray-400 hover:text-blue-600"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map((item) => {
            const statusConfig = getStatusConfig(item.printStatus)
            const StatusIcon = statusConfig.icon
            
            return (
              <div key={item.id} className={`bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow border-l-4 ${
                groupByOrder && orderColors[item.orderId] 
                  ? `${getPriorityBorderColor(item.priority)} ${orderColors[item.orderId].bg}`
                  : getPriorityColor(item.priority)
              }`}>
                <div className="flex items-start justify-between mb-4">
                  <img 
                    src={item.imageUrl} 
                    alt={item.name}
                    className="h-12 w-12 rounded-lg object-cover border border-gray-200"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = generateProductPreview(item)
                    }}
                  />
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {statusConfig.label}
                  </span>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{item.name}</h3>
                    <p className="text-sm text-gray-500">
                      #{item.orderExternalId}
                      {groupByOrder && item.orderItemsCount && item.orderItemsCount > 1 && (
                        <span className="ml-2 text-xs">📦 {item.orderItemIndex}/{item.orderItemsCount}</span>
                      )}
                    </p>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Typ:</span>
                      <span className="capitalize">{item.productType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Rozmiar:</span>
                      <span>{item.dimensions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Ilość:</span>
                      <span>{item.quantity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Czas:</span>
                      <span>~{item.estimatedTime}min</span>
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        item.priority === 'high' ? 'bg-red-100 text-red-800' :
                        item.priority === 'medium' ? 'bg-amber-100 text-amber-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        Priorytet: {item.priority}
                      </span>
                      <div className="flex space-x-2">
                        {item.printStatus === 'NOT_PRINTED' && (
                          <button
                            onClick={() => updateItemPrintStatus(item.id, 'PRINTING')}
                            className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium hover:bg-blue-200 transition-colors"
                          >
                            Rozpocznij
                          </button>
                        )}
                        {item.printStatus === 'PRINTING' && (
                          <button
                            onClick={() => updateItemPrintStatus(item.id, 'PRINTED')}
                            className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-medium hover:bg-green-200 transition-colors"
                          >
                            Ukończ
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {items.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <div className="mx-auto h-24 w-24 text-6xl mb-6">🎨</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Brak elementów do druku</h3>
          <p className="text-gray-500 mb-6">
            Wszystkie zamówienia zostały przetworzone lub nie ma aktywnych zamówień.
          </p>
          <button 
            onClick={() => window.location.href = '/dashboard/orders'}
            className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Zobacz zamówienia
          </button>
        </div>
      )}
    </div>
  )
}