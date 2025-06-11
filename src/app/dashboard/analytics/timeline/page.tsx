'use client'

import { useState, useEffect } from 'react'
import { formStyles } from '@/styles/form-styles'
import toast from 'react-hot-toast'
import {
  CalendarDaysIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  ClockIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'

interface TimelineData {
  periods: Array<{
    key: string
    label: string
    startDate: string
    endDate: string
    orders: number
    revenue: number
    averageOrderValue: number
    items: number
    customers: number
    growth: {
      orders: number
      revenue: number
    }
    topProducts: Array<{
      name: string
      quantity: number
      revenue: number
    }>
    statusBreakdown: {
      NEW: number
      PROCESSING: number
      PRINTED: number
      SHIPPED: number
      DELIVERED: number
      CANCELLED: number
    }
  }>
  summary: {
    totalOrders: number
    totalRevenue: number
    totalCustomers: number
    averageOrdersPerPeriod: number
    averageRevenuePerPeriod: number
    bestPeriod: string
    worstPeriod: string
  }
}

type GroupingType = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
type SortBy = 'date' | 'orders' | 'revenue'

export default function TimelineAnalyticsPage() {
  const [timelineData, setTimelineData] = useState<TimelineData | null>(null)
  const [loading, setLoading] = useState(true)
  const [grouping, setGrouping] = useState<GroupingType>('monthly')
  const [sortBy, setSortBy] = useState<SortBy>('date')
  const [sortAsc, setSortAsc] = useState(false)
  const [expandedPeriods, setExpandedPeriods] = useState<Set<string>>(new Set())
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setMonth(new Date().getMonth() - 12)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    fetchTimelineData()
  }, [grouping, dateRange])

  const fetchTimelineData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        grouping,
        dateFrom: dateRange.from,
        dateTo: dateRange.to
      })

      const response = await fetch(`/api/analytics/timeline?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setTimelineData(data.data)
      } else {
        toast.error('Błąd wczytywania danych czasowych')
      }
    } catch (error) {
      console.error('Error fetching timeline data:', error)
      toast.error('Błąd wczytywania analizy czasowej')
    } finally {
      setLoading(false)
    }
  }

  const togglePeriod = (periodKey: string) => {
    const newExpanded = new Set(expandedPeriods)
    if (newExpanded.has(periodKey)) {
      newExpanded.delete(periodKey)
    } else {
      newExpanded.add(periodKey)
    }
    setExpandedPeriods(newExpanded)
  }

  const getSortedPeriods = () => {
    if (!timelineData) return []
    
    const periods = [...timelineData.periods]
    
    switch (sortBy) {
      case 'orders':
        return periods.sort((a, b) => sortAsc ? a.orders - b.orders : b.orders - a.orders)
      case 'revenue':
        return periods.sort((a, b) => sortAsc ? a.revenue - b.revenue : b.revenue - a.revenue)
      case 'date':
      default:
        return periods.sort((a, b) => {
          const dateA = new Date(a.startDate).getTime()
          const dateB = new Date(b.startDate).getTime()
          return sortAsc ? dateA - dateB : dateB - dateA
        })
    }
  }

  const formatPeriodLabel = (period: any) => {
    const start = new Date(period.startDate)
    const end = new Date(period.endDate)
    
    switch (grouping) {
      case 'daily':
        return start.toLocaleDateString('pl-PL', { day: '2-digit', month: 'long', year: 'numeric' })
      case 'weekly':
        return `${start.toLocaleDateString('pl-PL', { day: '2-digit', month: 'short' })} - ${end.toLocaleDateString('pl-PL', { day: '2-digit', month: 'short', year: 'numeric' })}`
      case 'monthly':
        return start.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })
      case 'quarterly':
        const quarter = Math.floor(start.getMonth() / 3) + 1
        return `Q${quarter} ${start.getFullYear()}`
      case 'yearly':
        return start.getFullYear().toString()
      default:
        return period.label
    }
  }

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return <ArrowTrendingUpIcon className="h-4 w-4 text-green-600" />
    if (growth < 0) return <ArrowTrendingDownIcon className="h-4 w-4 text-red-600" />
    return null
  }

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return 'text-green-600'
    if (growth < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Ładowanie analizy czasowej...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 -mx-6 -mt-6 px-6 py-6">
        <div className="flex items-center">
          <CalendarDaysIcon className="h-8 w-8 text-gray-600 mr-3" />
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 sm:text-3xl">Analiza chronologiczna</h1>
            <p className="text-sm text-gray-600 mt-1">Przegląd zamówień w ujęciu czasowym</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className={formStyles.label}>Grupowanie</label>
            <select
              value={grouping}
              onChange={(e) => setGrouping(e.target.value as GroupingType)}
              className={formStyles.select}
            >
              <option value="daily">Dzienne</option>
              <option value="weekly">Tygodniowe</option>
              <option value="monthly">Miesięczne</option>
              <option value="quarterly">Kwartalne</option>
              <option value="yearly">Roczne</option>
            </select>
          </div>

          <div>
            <label className={formStyles.label}>Sortuj według</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className={formStyles.select}
            >
              <option value="date">Data</option>
              <option value="orders">Liczba zamówień</option>
              <option value="revenue">Przychód</option>
            </select>
          </div>

          <div>
            <label className={formStyles.label}>Od daty</label>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              className={formStyles.input}
            />
          </div>

          <div>
            <label className={formStyles.label}>Do daty</label>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              className={formStyles.input}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-4">
          <button
            onClick={() => setSortAsc(!sortAsc)}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Sortowanie: {sortAsc ? '↑ Rosnąco' : '↓ Malejąco'}
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      {timelineData && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 border border-gray-200 hover:border-blue-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="flex-shrink-0 p-2 sm:p-2.5 lg:p-3 bg-blue-100 rounded-lg sm:rounded-xl shadow-lg group-hover:shadow-xl transition-shadow">
                <ShoppingBagIcon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Łącznie zam.</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{timelineData.summary.totalOrders}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 border border-gray-200 hover:border-green-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="flex-shrink-0 p-2 sm:p-2.5 lg:p-3 bg-green-100 rounded-lg sm:rounded-xl shadow-lg group-hover:shadow-xl transition-shadow">
                <CurrencyDollarIcon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Przychód</p>
                <p className="text-sm sm:text-lg lg:text-2xl font-bold text-gray-900">{timelineData.summary.totalRevenue.toFixed(0)} <span className="text-xs">zł</span></p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 border border-gray-200 hover:border-purple-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="flex-shrink-0 p-2 sm:p-2.5 lg:p-3 bg-purple-100 rounded-lg sm:rounded-xl shadow-lg group-hover:shadow-xl transition-shadow">
                <ChartBarIcon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-purple-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Śred./okres</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{timelineData.summary.averageOrdersPerPeriod.toFixed(1)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 border border-gray-200 hover:border-yellow-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="flex-shrink-0 p-2 sm:p-2.5 lg:p-3 bg-yellow-100 rounded-lg sm:rounded-xl shadow-lg group-hover:shadow-xl transition-shadow">
                <ArrowTrendingUpIcon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-yellow-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Najlepszy</p>
                <p className="text-sm sm:text-lg lg:text-xl font-bold text-gray-900">{timelineData.summary.bestPeriod}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 border border-gray-200 hover:border-red-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="flex-shrink-0 p-2 sm:p-2.5 lg:p-3 bg-red-100 rounded-lg sm:rounded-xl shadow-lg group-hover:shadow-xl transition-shadow">
                <ArrowTrendingDownIcon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-red-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Najsłabszy</p>
                <p className="text-sm sm:text-lg lg:text-xl font-bold text-gray-900">{timelineData.summary.worstPeriod}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      {timelineData && (
        <div className="space-y-4">
          {getSortedPeriods().map((period) => {
            const isExpanded = expandedPeriods.has(period.key)
            const isBestPeriod = period.label === timelineData.summary.bestPeriod
            const isWorstPeriod = period.label === timelineData.summary.worstPeriod

            return (
              <div
                key={period.key}
                className={`bg-white rounded-xl border-2 transition-all ${
                  isBestPeriod 
                    ? 'border-green-300 shadow-lg' 
                    : isWorstPeriod 
                      ? 'border-red-300' 
                      : 'border-gray-200'
                }`}
              >
                {/* Period Header */}
                <div
                  className="p-6 cursor-pointer hover:bg-gray-50"
                  onClick={() => togglePeriod(period.key)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <button className="mr-3">
                        {isExpanded ? (
                          <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                        ) : (
                          <ChevronRightIcon className="h-5 w-5 text-gray-500" />
                        )}
                      </button>
                      <div className="flex items-center">
                        <CalendarDaysIcon className="h-6 w-6 text-gray-400 mr-3" />
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {formatPeriodLabel(period)}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {period.startDate} → {period.endDate}
                          </p>
                        </div>
                      </div>
                      {isBestPeriod && (
                        <span className="ml-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          🏆 Najlepszy okres
                        </span>
                      )}
                      {isWorstPeriod && (
                        <span className="ml-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          📉 Najsłabszy okres
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-6">
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Zamówienia</p>
                        <div className="flex items-center">
                          <p className="text-2xl font-bold text-gray-900">{period.orders}</p>
                          {period.growth.orders !== 0 && (
                            <div className={`ml-2 flex items-center ${getGrowthColor(period.growth.orders)}`}>
                              {getGrowthIcon(period.growth.orders)}
                              <span className="text-sm font-medium ml-1">
                                {period.growth.orders > 0 ? '+' : ''}{period.growth.orders.toFixed(1)}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-center">
                        <p className="text-sm text-gray-600">Przychód</p>
                        <div className="flex items-center">
                          <p className="text-2xl font-bold text-gray-900">{period.revenue.toFixed(0)} zł</p>
                          {period.growth.revenue !== 0 && (
                            <div className={`ml-2 flex items-center ${getGrowthColor(period.growth.revenue)}`}>
                              {getGrowthIcon(period.growth.revenue)}
                              <span className="text-sm font-medium ml-1">
                                {period.growth.revenue > 0 ? '+' : ''}{period.growth.revenue.toFixed(1)}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-center">
                        <p className="text-sm text-gray-600">Śr. wartość</p>
                        <p className="text-2xl font-bold text-gray-900">{period.averageOrderValue.toFixed(2)} zł</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Status Breakdown */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Podział statusów</h4>
                        <div className="space-y-2">
                          {Object.entries(period.statusBreakdown).map(([status, count]) => (
                            <div key={status} className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">{status}</span>
                              <span className="text-sm font-medium text-gray-900">{count}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Top Products */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Najpopularniejsze produkty</h4>
                        <div className="space-y-2">
                          {period.topProducts.slice(0, 5).map((product, idx) => (
                            <div key={idx} className="flex items-center justify-between">
                              <span className="text-sm text-gray-600 truncate flex-1 mr-2">{product.name}</span>
                              <span className="text-sm font-medium text-gray-900">{product.quantity} szt</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Additional Stats */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Statystyki</h4>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Produktów</span>
                            <span className="text-sm font-medium text-gray-900">{period.items}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Klientów</span>
                            <span className="text-sm font-medium text-gray-900">{period.customers}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Śr. produktów/zam.</span>
                            <span className="text-sm font-medium text-gray-900">
                              {(period.items / period.orders).toFixed(1)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Export Button */}
      <div className="flex justify-end">
        <button className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
          📊 Eksportuj raport
        </button>
      </div>
    </div>
  )
}