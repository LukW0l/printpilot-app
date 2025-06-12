'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { formStyles } from '@/styles/form-styles'
import { 
  ClockIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  PlusIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'

interface Timer {
  id: string
  orderId?: string
  orderItemId?: string
  operationType: string
  description?: string
  dimensions?: string
  startTime: string
  endTime?: string
  duration?: number
  pausedDuration: number
  unitsCount: number
  timePerUnit?: number
  operatorName?: string
  operatorId?: string
  difficulty: string
  quality: string
  notes?: string
  isCompleted: boolean
  isPaused: boolean
}

interface ProductionStats {
  totalOperations: number
  totalTime: number
  averageTimePerUnit: number
  operationStats: Record<string, {
    count: number
    totalTime: number
    averageTime: number
    averageTimePerUnit: number
  }>
  operatorStats: Record<string, {
    count: number
    totalTime: number
    averageTime: number
    efficiency: number
  }>
  qualityStats: Record<string, number>
  difficultyStats: Record<string, {
    count: number
    averageTime: number
  }>
}

const operationLabels = {
  FRAME_PREP: 'Przygotowanie krosna',
  FRAME_ASSEMBLY: 'Składanie krosna',
  CANVAS_STRETCHING: 'Naciąganie płótna',
  CUTTING: 'Cięcie wydruków',
  CUTTING_CANVAS: 'Cięcie płótna',
  CUTTING_FRAME: 'Cięcie listew',
  PRINTING: 'Drukowanie',
  PRINT_PREP: 'Przygotowanie do druku',
  PRINT_PROCESSING: 'Przetwarzanie wydruku',
  FRAMING: 'Oprawianie',
  FRAME_MOUNTING: 'Montaż w ramie',
  FRAME_FINISHING: 'Wykończenie ramy',
  PACKAGING: 'Pakowanie',
  PACK_PROTECTION: 'Zabezpieczanie do wysyłki',
  PACK_LABELING: 'Etykietowanie paczki',
  QUALITY_CHECK: 'Kontrola jakości',
  INVENTORY_PREP: 'Przygotowanie materiałów',
  SETUP: 'Przygotowanie stanowiska',
  CLEANUP: 'Sprzątanie',
  OTHER: 'Inne'
}

const difficultyLabels = {
  EASY: 'Łatwe',
  MEDIUM: 'Średnie',
  HARD: 'Trudne'
}

const qualityLabels = {
  POOR: 'Słaba',
  GOOD: 'Dobra',
  EXCELLENT: 'Doskonała'
}

// Operacje które mogą mieć przypisane wymiary krosien
const dimensionBasedOperations = [
  'FRAME_PREP',
  'FRAME_ASSEMBLY', 
  'CANVAS_STRETCHING',
  'CUTTING_CANVAS',
  'CUTTING_FRAME',
  'FRAME_MOUNTING',
  'FRAME_FINISHING',
  'FRAMING'
]

interface Order {
  id: string
  externalId: string
  customerName: string
  order_items: Array<{
    id: string
    name: string
    quantity: number
    dimensions?: string
    printStatus?: string
    completedCount?: number
    completionStatus?: string
    frameRequirement?: {
      width: number
      height: number
      frameType: string
    }
  }>
}

export default function TimersPage() {
  const [activeTimers, setActiveTimers] = useState<Timer[]>([])
  const [timerHistory, setTimerHistory] = useState<Timer[]>([])
  const [stats, setStats] = useState<ProductionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showNewTimer, setShowNewTimer] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [showDetailedResults, setShowDetailedResults] = useState(false)
  
  // Nowe state dla wyboru zamówień
  const [availableOrders, setAvailableOrders] = useState<Order[]>([])
  const [selectedOrder, setSelectedOrder] = useState<string>('')
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [customDescription, setCustomDescription] = useState('')
  const [selectedOperation, setSelectedOperation] = useState<string>('FRAME_PREP')
  const [selectedOperator, setSelectedOperator] = useState<string>('Operator')
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('MEDIUM')
  const [showOrderSelector, setShowOrderSelector] = useState<boolean>(false)
  const [orderSearchTerm, setOrderSearchTerm] = useState<string>('')
  const [manualDimensions, setManualDimensions] = useState<string>('')
  const [useManualDimensions, setUseManualDimensions] = useState<boolean>(false)
  
  // Packaging-specific state
  const [availableCardboards, setAvailableCardboards] = useState<Array<{
    id: string
    width: number
    height: number
    stock: number
    price: number | string // Prisma Decimal can be number or string
  }>>([])
  const [selectedCardboard, setSelectedCardboard] = useState<string>('')

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    fetchData()
    fetchAvailableOrders()
    fetchAvailableCardboards()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        fetchActiveTimers(),
        fetchTimerHistory(),
        fetchStats()
      ])
    } finally {
      setLoading(false)
    }
  }

  const fetchActiveTimers = async () => {
    try {
      const response = await fetch('/api/production/timers?action=active')
      const data = await response.json()
      if (data.success) {
        setActiveTimers(data.data)
      }
    } catch (error) {
      console.error('Error fetching active timers:', error)
    }
  }

  const fetchTimerHistory = async (date?: string) => {
    try {
      const dateParam = date || selectedDate
      const response = await fetch(`/api/production/timers?action=history&date=${dateParam}&days=7`)
      const data = await response.json()
      if (data.success) {
        setTimerHistory(data.data)
      }
    } catch (error) {
      console.error('Error fetching timer history:', error)
    }
  }

  const fetchTimersForDate = async (date: string) => {
    try {
      const response = await fetch(`/api/production/timers?action=history&date=${date}&exactDate=true`)
      const data = await response.json()
      if (data.success) {
        return data.data
      }
      return []
    } catch (error) {
      console.error('Error fetching timers for date:', error)
      return []
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/production/timers?action=stats&days=30')
      const data = await response.json()
      if (data.success) {
        setStats(data.data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const fetchAvailableOrders = async () => {
    try {
      // Pobierz zamówienia które nie są jeszcze ukończone (dla wszystkich operacji)
      const response = await fetch('/api/orders?status=PROCESSING,NEW,PRINTED&limit=50')
      const data = await response.json()
      
      if (data.orders) {
        
        setAvailableOrders(data.orders || [])
      } else if (data.success && data.data) {
        setAvailableOrders(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
    }
  }

  const fetchAvailableCardboards = async () => {
    try {
      const response = await fetch('/api/production-costs/cardboard')
      const data = await response.json()
      if (Array.isArray(data)) {
        setAvailableCardboards(data.filter(c => c.stock > 0))
      }
    } catch (error) {
      console.error('Error fetching cardboards:', error)
    }
  }

  const startTimer = async (operationType: string, description?: string, unitsCount: number = 1, orderId?: string, orderItemIds?: string[], operatorName?: string, difficulty?: string, dimensions?: string, cardboardId?: string) => {
    try {
      const response = await fetch('/api/production/timers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          operationType,
          description,
          unitsCount,
          operatorName: operatorName || 'Operator',
          difficulty: difficulty || 'MEDIUM',
          orderId,
          orderItemIds,
          dimensions,
          cardboardId
        })
      })
      const data = await response.json()
      if (data.success) {
        toast.success('Timer rozpoczęty')
        fetchActiveTimers()
        setShowNewTimer(false)
        // Reset form
        setSelectedOperation('FRAME_PREP')
        setSelectedOperator('Operator')
        setSelectedDifficulty('MEDIUM')
        setSelectedOrder('')
        setSelectedItems([])
        setCustomDescription('')
        setShowOrderSelector(false)
        setOrderSearchTerm('')
        setManualDimensions('')
        setUseManualDimensions(false)
        setSelectedCardboard('')
      } else {
        toast.error('Nie udało się rozpocząć timera')
      }
    } catch (error) {
      console.error('Error starting timer:', error)
      toast.error('Błąd podczas rozpoczynania timera')
    }
  }

  const handleStartTimer = () => {
    const selectedOrderData = availableOrders.find(o => o.id === selectedOrder)
    
    // Określ wymiary
    let finalDimensions = ''
    if (dimensionBasedOperations.includes(selectedOperation)) {
      if (useManualDimensions) {
        finalDimensions = manualDimensions
      } else if (selectedOrderData && selectedItems.length > 0) {
        // Pobierz wymiary z pierwszego wybranego elementu
        const firstSelectedItem = selectedOrderData.order_items.find(item => selectedItems.includes(item.id))
        if (firstSelectedItem?.dimensions) {
          finalDimensions = firstSelectedItem.dimensions
        } else if (firstSelectedItem?.frameRequirement) {
          finalDimensions = `${firstSelectedItem.frameRequirement.width}x${firstSelectedItem.frameRequirement.height}`
        }
      }
    }
    
    const description = customDescription || (selectedOrderData ? 
      `${selectedOrderData.externalId} - ${selectedItems.length} elementów${finalDimensions ? ` (${finalDimensions})` : ''}` : 
      `Timer ${finalDimensions ? `- ${finalDimensions}` : 'bez przypisania'}`)
    
    const totalUnits = selectedItems.length || 1
    
    startTimer(
      selectedOperation,
      description,
      totalUnits,
      selectedOrder || undefined,
      selectedItems.length > 0 ? selectedItems : undefined,
      selectedOperator,
      selectedDifficulty,
      finalDimensions,
      selectedCardboard || undefined
    )
  }

  const pauseTimer = async (timerId: string) => {
    try {
      const response = await fetch('/api/production/timers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'pause',
          timerId
        })
      })
      const data = await response.json()
      if (data.success) {
        toast.success('Timer wstrzymany')
        fetchActiveTimers()
      }
    } catch (error) {
      console.error('Error pausing timer:', error)
      toast.error('Błąd podczas wstrzymywania timera')
    }
  }

  const resumeTimer = async (timerId: string) => {
    try {
      const response = await fetch('/api/production/timers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resume',
          timerId
        })
      })
      const data = await response.json()
      if (data.success) {
        toast.success('Timer wznowiony')
        fetchActiveTimers()
      }
    } catch (error) {
      console.error('Error resuming timer:', error)
      toast.error('Błąd podczas wznawiania timera')
    }
  }

  const stopTimer = async (timerId: string, quality: string = 'GOOD', notes?: string) => {
    try {
      const response = await fetch('/api/production/timers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'stop',
          timerId,
          quality,
          notes
        })
      })
      const data = await response.json()
      if (data.success) {
        toast.success('Timer zakończony')
        fetchActiveTimers()
        fetchTimerHistory()
        fetchStats()
      }
    } catch (error) {
      console.error('Error stopping timer:', error)
      toast.error('Błąd podczas kończenia timera')
    }
  }

  const formatDuration = (startTime: string, endTime?: string, pausedDuration: number = 0) => {
    const start = new Date(startTime)
    const end = endTime ? new Date(endTime) : currentTime
    const totalMs = end.getTime() - start.getTime() - (pausedDuration * 1000)
    
    const hours = Math.floor(totalMs / (1000 * 60 * 60))
    const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((totalMs % (1000 * 60)) / 1000)
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Ładowanie timerów produkcji...</p>
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
            <ClockIcon className="h-8 w-8 text-gray-600 mr-3" />
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 sm:text-3xl">Timery produkcji</h1>
              <p className="text-sm text-gray-600 mt-1">Pomiar czasu operacji produkcyjnych w czasie rzeczywistym</p>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowDetailedResults(true)}
              className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              <ChartBarIcon className="h-4 w-4 mr-2" />
              Szczegółowe wyniki
            </button>
            <button
              onClick={() => setShowNewTimer(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Nowy timer
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ClockIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Operacje (30 dni)</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalOperations}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <ChartBarIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Całkowity czas</p>
                <p className="text-2xl font-semibold text-gray-900">{formatTime(stats.totalTime)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <ClockIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Średni czas/jednostka</p>
                <p className="text-2xl font-semibold text-gray-900">{formatTime(Math.round(stats.averageTimePerUnit))}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <PlayIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Aktywne timery</p>
                <p className="text-2xl font-semibold text-gray-900">{activeTimers.length}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Start Buttons */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Szybki start</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {Object.entries(operationLabels).slice(0, 6).map(([key, label]) => (
            <button
              key={key}
              onClick={() => {
                setSelectedOperation(key)
                setShowNewTimer(true)
              }}
              className="p-3 text-center border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
            >
              <div className="text-sm font-medium text-gray-900">{label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Active Timers */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Aktywne timery ({activeTimers.length})
          </h2>
        </div>

        {activeTimers.length === 0 ? (
          <div className="p-12 text-center">
            <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Brak aktywnych timerów</h3>
            <p className="text-gray-600 mb-6">
              Rozpocznij pomiar czasu operacji produkcyjnych aby monitorować wydajność.
            </p>
            <button
              onClick={() => setShowNewTimer(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Rozpocznij timer
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {activeTimers.map((timer) => (
              <div key={timer.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {operationLabels[timer.operationType as keyof typeof operationLabels]}
                      </h3>
                      {timer.isPaused && (
                        <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          ⏸️ Wstrzymany
                        </span>
                      )}
                    </div>
                    
                    {timer.description && (
                      <p className="text-sm text-gray-600 mt-1">{timer.description}</p>
                    )}
                    
                    {/* Pokazuj postęp ukończenia jeśli timer jest powiązany z elementem zamówienia */}
                    {timer.orderItemId && (
                      <div className="mt-2 text-sm">
                        <span className="text-gray-500">Pozostało do wykonania: </span>
                        <span className="font-medium text-blue-600">
                          {(() => {
                            const order = availableOrders.find(o => o.order_items.some(item => item.id === timer.orderItemId))
                            const item = order?.order_items.find(item => item.id === timer.orderItemId)
                            if (item) {
                              const remaining = item.quantity - (item.completedCount || 0)
                              return `${remaining}/${item.quantity} sztuk`
                            }
                            return timer.unitsCount
                          })()}
                        </span>
                      </div>
                    )}

                    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Czas trwania:</span>
                        <div className="font-mono text-lg font-semibold text-blue-600">
                          {formatDuration(timer.startTime, undefined, timer.pausedDuration)}
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-gray-500">Jednostek:</span>
                        <div className="font-semibold">{timer.unitsCount}</div>
                      </div>
                      
                      <div>
                        <span className="text-gray-500">Operator:</span>
                        <div className="font-semibold">{timer.operatorName || 'Nie przypisano'}</div>
                      </div>
                      
                      <div>
                        <span className="text-gray-500">Trudność:</span>
                        <div className="font-semibold">
                          {difficultyLabels[timer.difficulty as keyof typeof difficultyLabels]}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    {timer.isPaused ? (
                      <button
                        onClick={() => resumeTimer(timer.id)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Wznów timer"
                      >
                        <PlayIcon className="h-5 w-5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => pauseTimer(timer.id)}
                        className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                        title="Wstrzymaj timer"
                      >
                        <PauseIcon className="h-5 w-5" />
                      </button>
                    )}
                    
                    <button
                      onClick={() => stopTimer(timer.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Zakończ timer"
                    >
                      <StopIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent History */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Historia operacji (7 dni)
          </h2>
        </div>

        {timerHistory.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-600">Brak historii operacji</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Operacja
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Czas trwania
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Jednostek
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Czas/jednostka
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Jakość
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {timerHistory.slice(0, 10).map((timer) => (
                  <tr key={timer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {operationLabels[timer.operationType as keyof typeof operationLabels]}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                      {timer.duration ? formatTime(timer.duration) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {timer.unitsCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                      {timer.timePerUnit ? formatTime(Math.round(timer.timePerUnit)) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        timer.quality === 'EXCELLENT' ? 'bg-green-100 text-green-800' :
                        timer.quality === 'GOOD' ? 'bg-blue-100 text-blue-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {qualityLabels[timer.quality as keyof typeof qualityLabels]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(timer.startTime).toLocaleDateString('pl-PL')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Timer Modal */}
      {showNewTimer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Rozpocznij nowy timer produkcyjny</h2>
              
              <div className="space-y-6">
                {/* Typ operacji */}
                <div>
                  <label className={formStyles.label}>
                    Typ operacji *
                  </label>
                  <select 
                    value={selectedOperation}
                    onChange={(e) => setSelectedOperation(e.target.value)}
                    className={formStyles.select}
                  >
                    {Object.entries(operationLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* Operator */}
                <div>
                  <label className={formStyles.label}>
                    Operator *
                  </label>
                  <select 
                    value={selectedOperator}
                    onChange={(e) => setSelectedOperator(e.target.value)}
                    className={formStyles.select}
                  >
                    <option value="Operator">Operator (domyślny)</option>
                    <option value="Anna Kowalska">Anna Kowalska</option>
                    <option value="Jan Nowak">Jan Nowak</option>
                    <option value="Piotr Wiśniewski">Piotr Wiśniewski</option>
                    <option value="Maria Dąbrowska">Maria Dąbrowska</option>
                    <option value="Tomasz Lewandowski">Tomasz Lewandowski</option>
                  </select>
                </div>

                {/* Poziom trudności */}
                <div>
                  <label className={formStyles.label}>
                    Poziom trudności
                  </label>
                  <select 
                    value={selectedDifficulty}
                    onChange={(e) => setSelectedDifficulty(e.target.value)}
                    className={formStyles.select}
                  >
                    {Object.entries(difficultyLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* Wymiary krosna - dla operacji związanych z krosnem */}
                {dimensionBasedOperations.includes(selectedOperation) && (
                  <div>
                    <label className={formStyles.label}>
                      Rozmiar krosna/obrazu
                    </label>
                    
                    <div className="space-y-3">
                      {/* Opcja: wymiary z zamówienia */}
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="dimensionSource"
                          checked={!useManualDimensions}
                          onChange={() => setUseManualDimensions(false)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 mr-2"
                        />
                        <span className="text-sm text-gray-900">Używaj wymiarów z wybranego zamówienia</span>
                      </label>
                      
                      {/* Opcja: wymiary ręczne */}
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="dimensionSource"
                          checked={useManualDimensions}
                          onChange={() => setUseManualDimensions(true)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 mr-2"
                        />
                        <span className="text-sm text-gray-900">Wprowadź wymiary ręcznie</span>
                      </label>
                      
                      {/* Pole wymiarów ręcznych */}
                      {useManualDimensions && (
                        <div className="ml-6">
                          <input
                            type="text"
                            placeholder="np. 60x40, 120x80, 150x100"
                            value={manualDimensions}
                            onChange={(e) => setManualDimensions(e.target.value)}
                            className={formStyles.input}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Format: szerokość×wysokość w cm (np. 60x40)
                          </p>
                        </div>
                      )}
                      
                      {/* Podpowiedzi popularnych rozmiarów */}
                      {useManualDimensions && (
                        <div className="ml-6">
                          <p className="text-xs text-gray-600 mb-2">Popularne rozmiary:</p>
                          <div className="flex flex-wrap gap-1">
                            {['30x20', '40x30', '50x40', '60x40', '70x50', '80x60', '100x70', '120x80', '150x100'].map(size => (
                              <button
                                key={size}
                                type="button"
                                onClick={() => setManualDimensions(size)}
                                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                              >
                                {size}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Wybór kartonu dla operacji pakowania */}
                {selectedOperation === 'PACKAGING' && (
                  <div>
                    {/* Ostrzeżenie o konieczności wyboru zamówienia */}
                    {!selectedOrder && (
                      <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-center">
                          <span className="text-orange-600 mr-2">⚠️</span>
                          <p className="text-sm text-orange-800">
                            <strong>Pakowanie wymaga wyboru zamówienia!</strong> Wybierz zamówienie poniżej, aby system mógł zasugerować odpowiednie kartony.
                          </p>
                        </div>
                      </div>
                    )}
                    
                    <label className={formStyles.label}>
                      Karton ochronny
                      {selectedOrder && (
                        <span className="ml-2 text-sm text-blue-600">
                          dla zamówienia #{availableOrders.find(o => o.id === selectedOrder)?.externalId}
                        </span>
                      )}
                    </label>
                    
                    {/* Podsumowanie pakowanego zamówienia */}
                    {selectedOrder && selectedItems.length > 0 && (
                      <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center mb-2">
                          <span className="text-blue-600 mr-2">📦</span>
                          <strong className="text-blue-900">Pakujesz zamówienie:</strong>
                        </div>
                        <div className="text-sm text-blue-800">
                          <div className="font-medium">#{availableOrders.find(o => o.id === selectedOrder)?.externalId} - {availableOrders.find(o => o.id === selectedOrder)?.customerName}</div>
                          <div className="mt-1">
                            <strong>Wybrane elementy ({selectedItems.length}):</strong>
                            {(() => {
                              const selectedOrderData = availableOrders.find(o => o.id === selectedOrder)
                              const selectedItemsData = selectedOrderData?.order_items.filter(item => selectedItems.includes(item.id)) || []
                              return (
                                <ul className="mt-1 space-y-1">
                                  {selectedItemsData.map(item => (
                                    <li key={item.id} className="ml-4">
                                      • {item.name || 'Unknown Item'} {item.dimensions ? `(${item.dimensions})` : ''} - {item.quantity} szt.
                                    </li>
                                  ))}
                                </ul>
                              )
                            })()}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Sugerowane kartony na podstawie wymiarów */}
                    {availableCardboards.length > 0 && (
                      <div className="space-y-3">
                        <select 
                          value={selectedCardboard}
                          onChange={(e) => setSelectedCardboard(e.target.value)}
                          className={formStyles.select}
                        >
                          <option value="">Wybierz karton...</option>
                          {availableCardboards
                            .sort((a, b) => (a.width * a.height) - (b.width * b.height))
                            .map((cardboard) => (
                              <option key={cardboard.id} value={cardboard.id}>
                                {cardboard.width}×{cardboard.height} cm - Stan: {cardboard.stock} szt. - {Number(cardboard.price).toFixed(2)} PLN
                              </option>
                            ))}
                        </select>
                        
                        {/* Automatyczne sugerowanie na podstawie wymiarów */}
                        {(manualDimensions || (selectedOrder && selectedItems.length > 0)) && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <h4 className="font-medium text-yellow-800 mb-2">💡 Sugerowane kartony:</h4>
                            {(() => {
                              // Oblicz wymiary z zamówienia lub manual
                              let targetWidth = 0, targetHeight = 0
                              if (manualDimensions) {
                                const match = manualDimensions.match(/(\d+)x(\d+)/)
                                if (match) {
                                  targetWidth = parseInt(match[1])
                                  targetHeight = parseInt(match[2])
                                }
                              } else if (selectedOrder && selectedItems.length > 0) {
                                const selectedOrderData = availableOrders.find(o => o.id === selectedOrder)
                                const selectedItemsData = selectedOrderData?.order_items.filter(item => selectedItems.includes(item.id)) || []
                                
                                // Znajdź największe wymiary
                                selectedItemsData.forEach(item => {
                                  if (item.dimensions) {
                                    const match = item.dimensions.match(/(\d+)x(\d+)/)
                                    if (match) {
                                      targetWidth = Math.max(targetWidth, parseInt(match[1]))
                                      targetHeight = Math.max(targetHeight, parseInt(match[2]))
                                    }
                                  }
                                })
                              }
                              
                              if (targetWidth && targetHeight) {
                                // Znajdź kartony które pomieszczą obraz z marginesem 2cm
                                const suitableCardboards = availableCardboards
                                  .filter(c => c.width >= targetWidth + 2 && c.height >= targetHeight + 2)
                                  .sort((a, b) => (a.width * a.height) - (b.width * b.height))
                                  .slice(0, 3)
                                
                                if (suitableCardboards.length > 0) {
                                  return (
                                    <div className="space-y-1">
                                      <p className="text-sm text-yellow-700">
                                        Dla wymiarów {targetWidth}×{targetHeight} cm:
                                      </p>
                                      {suitableCardboards.map(cardboard => (
                                        <button
                                          key={cardboard.id}
                                          type="button"
                                          onClick={() => setSelectedCardboard(cardboard.id)}
                                          className="block w-full text-left px-2 py-1 text-sm bg-white border border-yellow-300 rounded hover:bg-yellow-50"
                                        >
                                          📦 {cardboard.width}×{cardboard.height} cm (stan: {cardboard.stock}) - {Number(cardboard.price).toFixed(2)} PLN
                                        </button>
                                      ))}
                                    </div>
                                  )
                                } else {
                                  return (
                                    <p className="text-sm text-yellow-700">
                                      ⚠️ Brak kartonów odpowiednich dla wymiarów {targetWidth}×{targetHeight} cm. Potrzebny karton min. {targetWidth + 2}×{targetHeight + 2} cm.
                                    </p>
                                  )
                                }
                              }
                              return null
                            })()}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {availableCardboards.length === 0 && (
                      <div className="text-center py-3 text-gray-500 text-sm">
                        Brak kartonów w magazynie. 
                        <button
                          type="button"
                          onClick={fetchAvailableCardboards}
                          className="text-blue-600 hover:text-blue-800 ml-1"
                        >
                          Odśwież
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Wybór zamówienia - nowy interfejs */}
                <div>
                  <label className={formStyles.label}>
                    Zamówienie i elementy {selectedOperation === 'PACKAGING' ? '(wymagane dla pakowania)' : '(opcjonalnie)'}
                  </label>
                  
                  <div className="space-y-3">
                    {/* Podsumowanie wybranego zamówienia */}
                    {selectedOrder && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-blue-900">
                              #{availableOrders.find(o => o.id === selectedOrder)?.externalId}
                            </div>
                            <div className="text-sm text-blue-700">
                              {availableOrders.find(o => o.id === selectedOrder)?.customerName}
                            </div>
                            {selectedItems.length > 0 && (
                              <div className="text-sm text-blue-600 mt-1">
                                Wybrano {selectedItems.length} z {availableOrders.find(o => o.id === selectedOrder)?.order_items.length} elementów
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOrder('')
                              setSelectedItems([])
                            }}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            Usuń
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {/* Przycisk wyboru zamówienia */}
                    <button
                      type="button"
                      onClick={() => setShowOrderSelector(true)}
                      className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-center text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
                    >
                      {selectedOrder ? 'Zmień zamówienie lub elementy' : 'Wybierz zamówienie i elementy'}
                    </button>
                    
                    {availableOrders.length === 0 && (
                      <div className="text-center py-2">
                        <p className="text-xs text-gray-500 mb-2">Brak dostępnych zamówień</p>
                        <button
                          type="button"
                          onClick={fetchAvailableOrders}
                          className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Odśwież listę
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Własny opis */}
                <div>
                  <label className={formStyles.label}>
                    Dodatkowy opis (opcjonalnie)
                  </label>
                  <input
                    type="text"
                    value={customDescription}
                    onChange={(e) => setCustomDescription(e.target.value)}
                    className={formStyles.input}
                    placeholder="np. Specjalne wymagania, uwagi"
                  />
                </div>

                {/* Podsumowanie */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">Podsumowanie:</h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Operacja: {operationLabels[selectedOperation as keyof typeof operationLabels]}</li>
                    <li>• Operator: {selectedOperator}</li>
                    <li>• Trudność: {difficultyLabels[selectedDifficulty as keyof typeof difficultyLabels]}</li>
                    {dimensionBasedOperations.includes(selectedOperation) && (
                      <li>• Rozmiar: {
                        useManualDimensions 
                          ? (manualDimensions || 'nie określono') 
                          : (selectedOrder && selectedItems.length > 0) 
                            ? 'z zamówienia'
                            : 'nie określono'
                      }</li>
                    )}
                    {selectedOrder && (
                      <li>• <strong>Zamówienie: #{availableOrders.find(o => o.id === selectedOrder)?.externalId}</strong> ({availableOrders.find(o => o.id === selectedOrder)?.customerName})</li>
                    )}
                    <li>• Elementów: {selectedItems.length || 1}</li>
                    {customDescription && (
                      <li>• Opis: {customDescription}</li>
                    )}
                    {selectedOperation === 'PACKAGING' && selectedCardboard && (
                      <li>• Karton: {
                        (() => {
                          const cardboard = availableCardboards.find(c => c.id === selectedCardboard)
                          return cardboard ? `${cardboard.width}×${cardboard.height} cm` : 'Wybrany'
                        })()
                      }</li>
                    )}
                  </ul>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowNewTimer(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleStartTimer}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Rozpocznij timer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Order Selector Modal */}
      {showOrderSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-60">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-screen overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Wybierz zamówienie i elementy</h2>
                <button
                  onClick={() => setShowOrderSelector(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              {/* Search */}
              <div className="mt-4">
                <input
                  type="text"
                  placeholder="Szukaj po numerze zamówienia lub nazwisku klienta..."
                  value={orderSearchTerm}
                  onChange={(e) => setOrderSearchTerm(e.target.value)}
                  className={formStyles.input}
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {availableOrders
                .filter(order => {
                  // Filtruj po wyszukiwaniu
                  const matchesSearch = order.externalId.toLowerCase().includes(orderSearchTerm.toLowerCase()) ||
                    order.customerName.toLowerCase().includes(orderSearchTerm.toLowerCase())
                  
                  if (!matchesSearch) return false
                  
                  // Sprawdź czy zamówienie ma dostępne elementy dla wybranej operacji
                  const hasAvailableItems = order.order_items.some(item => {
                    if (selectedOperation === 'PACKAGING') {
                      return item.printStatus === 'PRINTED' && item.completionStatus !== 'COMPLETED'
                    }
                    if (selectedOperation === 'FRAMING') {
                      return item.printStatus === 'PRINTED' && item.completionStatus !== 'COMPLETED'
                    }
                    if (selectedOperation === 'PRINTING') {
                      return item.printStatus === 'NOT_PRINTED' || !item.printStatus
                    }
                    return item.completionStatus !== 'COMPLETED'
                  })
                  
                  return hasAvailableItems
                })
                .map((order) => (
                  <div 
                    key={order.id} 
                    className={`border rounded-lg p-4 mb-4 ${
                      selectedOrder === order.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">#{order.externalId}</h3>
                        <p className="text-sm text-gray-600">{order.customerName}</p>
                        {(() => {
                          const totalCompleted = order.order_items.reduce((sum, item) => sum + (item.completedCount || 0), 0)
                          const totalQuantity = order.order_items.reduce((sum, item) => sum + item.quantity, 0)
                          if (totalCompleted > 0) {
                            return (
                              <p className="text-xs text-orange-600 font-medium mt-1">
                                Postęp: {totalCompleted}/{totalQuantity} sztuk
                              </p>
                            )
                          }
                          return null
                        })()}
                      </div>
                      <button
                        onClick={() => {
                          if (selectedOrder === order.id) {
                            setSelectedOrder('')
                            setSelectedItems([])
                          } else {
                            setSelectedOrder(order.id)
                            setSelectedItems([])
                          }
                        }}
                        className={`px-3 py-1 rounded text-sm font-medium ${
                          selectedOrder === order.id 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {selectedOrder === order.id ? 'Wybrane' : 'Wybierz'}
                      </button>
                    </div>
                    
                    {/* Elementy zamówienia */}
                    <div className="space-y-2">
                      <div className="flex items-center mb-2">
                        <input
                          type="checkbox"
                          checked={(() => {
                            const filteredItems = order.order_items.filter(item => {
                              if (selectedOperation === 'PACKAGING' || selectedOperation === 'FRAMING') {
                                return item.printStatus === 'PRINTED'
                              }
                              if (selectedOperation === 'PRINTING') {
                                return item.printStatus === 'NOT_PRINTED' || !item.printStatus
                              }
                              return true
                            })
                            return selectedOrder === order.id && selectedItems.length === filteredItems.length && filteredItems.length > 0
                          })()}
                          onChange={(e) => {
                            if (selectedOrder !== order.id) {
                              setSelectedOrder(order.id)
                            }
                            const filteredItems = order.order_items.filter(item => {
                              if (selectedOperation === 'PACKAGING' || selectedOperation === 'FRAMING') {
                                return item.printStatus === 'PRINTED'
                              }
                              if (selectedOperation === 'PRINTING') {
                                return item.printStatus === 'NOT_PRINTED' || !item.printStatus
                              }
                              return true
                            })
                            if (e.target.checked) {
                              setSelectedItems(filteredItems.map(item => item.id))
                            } else {
                              setSelectedItems([])
                            }
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          Wszystkie elementy ({(() => {
                            const filteredItems = order.order_items.filter(item => {
                              const result = (() => {
                                if (selectedOperation === 'PACKAGING') {
                                  // Pakowanie - tylko wydrukowane elementy które nie są jeszcze w pełni ukończone
                                  return item.printStatus === 'PRINTED' && item.completionStatus !== 'COMPLETED'
                                }
                                if (selectedOperation === 'FRAMING') {
                                  // Oprawianie - tylko wydrukowane elementy które nie są jeszcze w pełni ukończone
                                  return item.printStatus === 'PRINTED' && item.completionStatus !== 'COMPLETED'
                                }
                                if (selectedOperation === 'PRINTING') {
                                  // Druk - tylko niewydrukowane elementy
                                  return item.printStatus === 'NOT_PRINTED' || !item.printStatus
                                }
                                // Inne operacje - wszystkie elementy które nie są ukończone
                                return item.completionStatus !== 'COMPLETED'
                              })()
                              
                              // Debug logging (disabled to reduce spam)
                              // if (order.externalId === '38499') {
                              //   console.log(`Filtering item ${item.name} for operation ${selectedOperation}:`, {
                              //     printStatus: item.printStatus,
                              //     result: result
                              //   })
                              // }
                              
                              return result
                            })
                            return filteredItems.length
                          })()})
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-6">
                        {order.order_items.filter(item => {
                          // Filtrowanie elementów na podstawie typu operacji
                          if (selectedOperation === 'PACKAGING') {
                            // Pakowanie - tylko wydrukowane elementy które nie są jeszcze w pełni ukończone
                            return item.printStatus === 'PRINTED' && item.completionStatus !== 'COMPLETED'
                          }
                          if (selectedOperation === 'FRAMING') {
                            // Oprawianie - tylko wydrukowane elementy które nie są jeszcze w pełni ukończone
                            return item.printStatus === 'PRINTED' && item.completionStatus !== 'COMPLETED'
                          }
                          if (selectedOperation === 'PRINTING') {
                            // Druk - tylko niewydrukowane elementy
                            return item.printStatus === 'NOT_PRINTED' || !item.printStatus
                          }
                          // Inne operacje - wszystkie elementy które nie są ukończone
                          return item.completionStatus !== 'COMPLETED'
                        }).map((item) => (
                          <label key={item.id} className="flex items-start p-2 border border-gray-100 rounded">
                            <input
                              type="checkbox"
                              checked={selectedOrder === order.id && selectedItems.includes(item.id)}
                              onChange={(e) => {
                                if (selectedOrder !== order.id) {
                                  setSelectedOrder(order.id)
                                  setSelectedItems([item.id])
                                } else if (e.target.checked) {
                                  setSelectedItems([...selectedItems, item.id])
                                } else {
                                  setSelectedItems(selectedItems.filter(id => id !== item.id))
                                }
                              }}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2 mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-gray-900 truncate">{item.name || 'Unknown Item'}</div>
                              <div className="text-xs text-gray-500">
                                Ilość: {item.quantity}
                                {item.dimensions && <span> • {item.dimensions}</span>}
                                {item.completedCount && item.completedCount > 0 && (
                                  <span className="ml-2 font-medium text-orange-600">
                                    ({item.completedCount}/{item.quantity} ukończono)
                                  </span>
                                )}
                                {item.printStatus && (
                                  <span className={`ml-2 px-1.5 py-0.5 rounded text-xs font-medium ${
                                    item.printStatus === 'PRINTED' 
                                      ? 'bg-green-100 text-green-800' 
                                      : item.printStatus === 'PRINTING'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {item.printStatus === 'PRINTED' ? 'Wydrukowane' : 
                                     item.printStatus === 'PRINTING' ? 'W druku' : 'Nie wydrukowane'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                
              {availableOrders.filter(order => 
                order.externalId.toLowerCase().includes(orderSearchTerm.toLowerCase()) ||
                order.customerName.toLowerCase().includes(orderSearchTerm.toLowerCase())
              ).length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    {orderSearchTerm ? 'Nie znaleziono zamówień pasujących do wyszukiwania' : 'Brak dostępnych zamówień'}
                  </p>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  {selectedOrder && selectedItems.length > 0 && (
                    <span>Wybrano {selectedItems.length} elementów z zamówienia #{availableOrders.find(o => o.id === selectedOrder)?.externalId}</span>
                  )}
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowOrderSelector(false)}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Gotowe
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Results Modal */}
      {showDetailedResults && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-xl">
            <div className="p-6 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-black">Szczegółowe wyniki produkcji</h2>
                <button
                  onClick={() => setShowDetailedResults(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-light"
                >
                  ✕
                </button>
              </div>
              
              {/* Date Selector */}
              <div className="mt-4 flex items-center space-x-4">
                <label className={formStyles.label + " mb-0"}>
                  Wybierz datę:
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className={formStyles.input + " w-auto"}
                />
                <button
                  onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                  className="px-3 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                >
                  Dzisiaj
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              <TimerResultsForDate date={selectedDate} fetchTimersForDate={fetchTimersForDate} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Component for detailed timer results for a specific date
interface TimerResultsForDateProps {
  date: string
  fetchTimersForDate: (date: string) => Promise<Timer[]>
}

function TimerResultsForDate({ date, fetchTimersForDate }: TimerResultsForDateProps) {
  const [dayTimers, setDayTimers] = useState<Timer[]>([])
  const [loading, setLoading] = useState(true)
  const [dayStats, setDayStats] = useState<any>(null)

  useEffect(() => {
    loadTimersForDate()
  }, [date])

  const loadTimersForDate = async () => {
    setLoading(true)
    try {
      const timers = await fetchTimersForDate(date)
      setDayTimers(timers)
      
      // Calculate day statistics
      if (timers.length > 0) {
        const completedTimers = timers.filter(t => t.isCompleted)
        const totalTime = completedTimers.reduce((sum, t) => sum + (t.duration || 0), 0)
        const totalUnits = completedTimers.reduce((sum, t) => sum + t.unitsCount, 0)
        
        // Group by operation type
        const operationGroups = completedTimers.reduce((groups, timer) => {
          const op = timer.operationType
          if (!groups[op]) {
            groups[op] = { timers: [], totalTime: 0, totalUnits: 0 }
          }
          groups[op].timers.push(timer)
          groups[op].totalTime += timer.duration || 0
          groups[op].totalUnits += timer.unitsCount
          return groups
        }, {} as Record<string, { timers: Timer[], totalTime: number, totalUnits: number }>)

        // Group by operator
        const operatorGroups = completedTimers.reduce((groups, timer) => {
          const op = timer.operatorName || 'Unknown'
          if (!groups[op]) {
            groups[op] = { timers: [], totalTime: 0, totalUnits: 0 }
          }
          groups[op].timers.push(timer)
          groups[op].totalTime += timer.duration || 0
          groups[op].totalUnits += timer.unitsCount
          return groups
        }, {} as Record<string, { timers: Timer[], totalTime: number, totalUnits: number }>)

        setDayStats({
          totalTimers: timers.length,
          completedTimers: completedTimers.length,
          totalTime,
          totalUnits,
          averageTimePerUnit: totalUnits > 0 ? totalTime / totalUnits : 0,
          operationGroups,
          operatorGroups
        })
      } else {
        setDayStats(null)
      }
    } catch (error) {
      console.error('Error loading timers for date:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const operationLabels = {
    FRAME_PREP: 'Przygotowanie krosna',
    FRAME_ASSEMBLY: 'Składanie krosna',
    CANVAS_STRETCHING: 'Naciąganie płótna',
    CUTTING: 'Cięcie wydruków',
    CUTTING_CANVAS: 'Cięcie płótna',
    CUTTING_FRAME: 'Cięcie listew',
    PRINTING: 'Drukowanie',
    PRINT_PREP: 'Przygotowanie do druku',
    PRINT_PROCESSING: 'Przetwarzanie wydruku',
    FRAMING: 'Oprawianie',
    FRAME_MOUNTING: 'Montaż w ramie',
    FRAME_FINISHING: 'Wykończenie ramy',
    PACKAGING: 'Pakowanie',
    PACK_PROTECTION: 'Zabezpieczanie do wysyłki',
    PACK_LABELING: 'Etykietowanie paczki',
    QUALITY_CHECK: 'Kontrola jakości',
    INVENTORY_PREP: 'Przygotowanie materiałów',
    SETUP: 'Przygotowanie stanowiska',
    CLEANUP: 'Sprzątanie',
    OTHER: 'Inne'
  }

  const qualityLabels = {
    POOR: 'Słaba',
    GOOD: 'Dobra',
    EXCELLENT: 'Doskonała'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Ładowanie wyników...</p>
        </div>
      </div>
    )
  }

  const selectedDateFormatted = new Date(date + 'T12:00:00').toLocaleDateString('pl-PL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  if (!dayStats || dayTimers.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mb-4">
          <ClockIcon className="h-16 w-16 text-gray-400 mx-auto" />
        </div>
        <h3 className="text-lg font-medium text-black mb-2">
          Brak danych na {selectedDateFormatted}
        </h3>
        <p className="text-gray-600">
          Nie znaleziono żadnych pomiarów czasowych dla wybranej daty.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with date */}
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-black">
          Wyniki produkcji na {selectedDateFormatted}
        </h3>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <div className="text-2xl font-bold text-blue-600">{dayStats.completedTimers}</div>
          <div className="text-sm text-gray-600">Ukończone operacje</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <div className="text-2xl font-bold text-green-600">{formatTime(dayStats.totalTime)}</div>
          <div className="text-sm text-gray-600">Całkowity czas pracy</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <div className="text-2xl font-bold text-purple-600">{dayStats.totalUnits}</div>
          <div className="text-sm text-gray-600">Jednostek wyprodukowanych</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <div className="text-2xl font-bold text-orange-600">{formatTime(Math.round(dayStats.averageTimePerUnit))}</div>
          <div className="text-sm text-gray-600">Średni czas/jednostka</div>
        </div>
      </div>

      {/* Operations Analysis */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="px-4 py-3 border-b border-gray-200">
          <h4 className="font-semibold text-black">Analiza według typu operacji</h4>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            {Object.entries(dayStats.operationGroups).map(([opType, data]: [string, any]) => (
              <div key={opType} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex-1">
                  <div className="font-medium text-black">
                    {operationLabels[opType as keyof typeof operationLabels] || opType}
                  </div>
                  <div className="text-sm text-gray-600">
                    {data.timers.length} operacji • {data.totalUnits} jednostek
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-lg font-semibold text-blue-600">
                    {formatTime(data.totalTime)}
                  </div>
                  <div className="text-sm text-gray-600">
                    Śred: {formatTime(Math.round(data.totalTime / data.totalUnits))} /szt
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Operators Analysis */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="px-4 py-3 border-b border-gray-200">
          <h4 className="font-semibold text-black">Analiza według operatorów</h4>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            {Object.entries(dayStats.operatorGroups).map(([operator, data]: [string, any]) => (
              <div key={operator} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex-1">
                  <div className="font-medium text-black">{operator}</div>
                  <div className="text-sm text-gray-600">
                    {data.timers.length} operacji • {data.totalUnits} jednostek
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-lg font-semibold text-green-600">
                    {formatTime(data.totalTime)}
                  </div>
                  <div className="text-sm text-gray-600">
                    Efekt: {formatTime(Math.round(data.totalTime / data.totalUnits))} /szt
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Timer List */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="px-4 py-3 border-b border-gray-200">
          <h4 className="font-semibold text-black">Szczegółowa lista operacji</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Godzina</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Operacja</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Operator</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Opis</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Wymiary</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Czas</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jednostek</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Czas/szt</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jakość</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {dayTimers
                .filter(timer => timer.isCompleted)
                .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                .map((timer) => (
                  <tr key={timer.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(timer.startTime).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {operationLabels[timer.operationType as keyof typeof operationLabels] || timer.operationType}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {timer.operatorName || 'Nie przypisano'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {timer.description || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {timer.dimensions || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-900">
                      {timer.duration ? formatTime(timer.duration) : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {timer.unitsCount}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-blue-600">
                      {timer.timePerUnit ? formatTime(Math.round(timer.timePerUnit)) : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        timer.quality === 'EXCELLENT' ? 'bg-green-100 text-green-800' :
                        timer.quality === 'GOOD' ? 'bg-blue-100 text-blue-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {qualityLabels[timer.quality as keyof typeof qualityLabels] || timer.quality}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}