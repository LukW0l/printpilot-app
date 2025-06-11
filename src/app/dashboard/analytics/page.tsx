'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardCharts from '@/components/DashboardCharts'

interface Analytics {
  ordersByDay: { date: string; count: number }[]
  ordersByStatus: { status: string; count: number }[]
  ordersByShop: { shop: string; count: number }[]
  revenueByDay: { date: string; revenue: number }[]
  totals: {
    totalOrders: number
    totalRevenue: number
    averageOrderValue: number
    todayOrders: number
  }
}

const timeRangeOptions = [
  { label: '7 dni', days: 7, key: '7d' },
  { label: '30 dni', days: 30, key: '30d' },
  { label: '90 dni', days: 90, key: '90d' },
  { label: '6 miesięcy', days: 180, key: '6m' },
  { label: '1 rok', days: 365, key: '1y' },
  { label: 'Wszystko', days: null, key: 'all' }
]

export default function AnalyticsPage() {
  const router = useRouter()
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d')

  useEffect(() => {
    fetchAnalytics()
  }, [selectedTimeRange])

  const fetchAnalytics = async () => {
    try {
      const timeRange = timeRangeOptions.find(t => t.key === selectedTimeRange)
      const daysParam = timeRange?.days ? `?days=${timeRange.days}` : ''
      const response = await fetch(`/api/analytics${daysParam}`)
      const data = await response.json()
      setAnalytics(data)
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTimeRangeChange = (rangeKey: string) => {
    setSelectedTimeRange(rangeKey)
    setLoading(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900">Brak dostępnych danych analitycznych</h3>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center py-4 space-y-4 lg:space-y-0">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/dashboard')}
                className="mr-4 text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Analityka</h1>
              <span className="ml-2 text-sm bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                {timeRangeOptions.find(t => t.key === selectedTimeRange)?.label}
              </span>
            </div>
            
            {/* Time Range Selector */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Okres:</span>
              <div className="flex flex-wrap rounded-lg border border-gray-300 p-0.5 sm:p-1 bg-gray-50 gap-0.5">
                {timeRangeOptions.map((range) => (
                  <button
                    key={range.key}
                    onClick={() => handleTimeRangeChange(range.key)}
                    className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                      selectedTimeRange === range.key
                        ? 'bg-purple-100 text-purple-700 border border-purple-300'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 lg:p-6 border border-gray-200">
            <div className="flex flex-col sm:flex-row items-center">
              <div className="p-2 bg-blue-100 rounded-md">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <div className="mt-2 sm:mt-0 sm:ml-4 text-center sm:text-left">
                <p className="text-xs sm:text-sm font-medium text-gray-600">Całkowita liczba zamówień</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{analytics.totals.totalOrders}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 lg:p-6 border border-gray-200">
            <div className="flex flex-col sm:flex-row items-center">
              <div className="p-2 bg-green-100 rounded-md">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="mt-2 sm:mt-0 sm:ml-4 text-center sm:text-left">
                <p className="text-xs sm:text-sm font-medium text-gray-600">Całkowity przychód</p>
                <p className="text-base sm:text-lg lg:text-2xl font-bold text-gray-900">{analytics.totals.totalRevenue.toFixed(0)} <span className="text-sm">PLN</span></p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 lg:p-6 border border-gray-200">
            <div className="flex flex-col sm:flex-row items-center">
              <div className="p-2 bg-purple-100 rounded-md">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="mt-2 sm:mt-0 sm:ml-4 text-center sm:text-left">
                <p className="text-xs sm:text-sm font-medium text-gray-600">Średnia wartość zamówienia</p>
                <p className="text-base sm:text-lg lg:text-2xl font-bold text-gray-900">{analytics.totals.averageOrderValue.toFixed(0)} <span className="text-sm">PLN</span></p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 lg:p-6 border border-gray-200">
            <div className="flex flex-col sm:flex-row items-center">
              <div className="p-2 bg-yellow-100 rounded-md">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="mt-2 sm:mt-0 sm:ml-4 text-center sm:text-left">
                <p className="text-xs sm:text-sm font-medium text-gray-600">Dzisiejsze zamówienia</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{analytics.totals.todayOrders}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <DashboardCharts
          ordersByDay={analytics.ordersByDay}
          ordersByStatus={analytics.ordersByStatus}
          ordersByShop={analytics.ordersByShop}
          revenueByDay={analytics.revenueByDay}
        />
      </div>
    </div>
  )
}