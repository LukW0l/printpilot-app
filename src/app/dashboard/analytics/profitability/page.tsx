'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { 
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ChartBarIcon,
  CalendarDaysIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

interface ProfitabilityInsights {
  totalOrders: number
  totalRevenue: number
  totalCosts: number
  totalProfit: number
  averageProfitMargin: number
  profitableOrders: number
  unprofitableOrders: number
  topProfitableProducts: Array<{
    productName: string
    productType: string
    frameSize: string
    orderCount: number
    totalProfit: number
    averageMargin: number
  }>
  costBreakdown: {
    materials: number
    labor: number
    shipping: number
    processing: number
    overhead: number
  }
  monthlyTrends: Array<{
    month: string
    revenue: number
    profit: number
    margin: number
  }>
}

interface ProfitableOrder {
  orderId: string
  externalId: string
  profit: number
  margin: number
  revenue: number
  totalCosts: number
  orderDate: string
}

export default function ProfitabilityPage() {
  const [insights, setInsights] = useState<ProfitabilityInsights | null>(null)
  const [mostProfitable, setMostProfitable] = useState<ProfitableOrder[]>([])
  const [leastProfitable, setLeastProfitable] = useState<ProfitableOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [recalculating, setRecalculating] = useState(false)
  const [days, setDays] = useState(30)

  useEffect(() => {
    fetchData()
  }, [days])

  const fetchData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        fetchInsights(),
        fetchMostProfitable(),
        fetchLeastProfitable()
      ])
    } finally {
      setLoading(false)
    }
  }

  const fetchInsights = async () => {
    try {
      const response = await fetch(`/api/analytics/profitability?action=insights&days=${days}`)
      const data = await response.json()
      if (data.success) {
        setInsights(data.data)
      }
    } catch (error) {
      console.error('Error fetching insights:', error)
      toast.error('Nie udało się pobrać danych rentowności')
    }
  }

  const fetchMostProfitable = async () => {
    try {
      const response = await fetch('/api/analytics/profitability?action=most_profitable&limit=10')
      const data = await response.json()
      if (data.success) {
        setMostProfitable(data.data)
      }
    } catch (error) {
      console.error('Error fetching most profitable:', error)
    }
  }

  const fetchLeastProfitable = async () => {
    try {
      const response = await fetch('/api/analytics/profitability?action=least_profitable&limit=10')
      const data = await response.json()
      if (data.success) {
        setLeastProfitable(data.data)
      }
    } catch (error) {
      console.error('Error fetching least profitable:', error)
    }
  }

  const recalculateAll = async () => {
    try {
      setRecalculating(true)
      const response = await fetch('/api/analytics/profitability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'recalculate_all', days })
      })
      const data = await response.json()
      if (data.success) {
        toast.success(`Przeliczono rentowność dla ${data.processed} zamówień`)
        fetchData()
      } else {
        toast.error('Nie udało się przeliczyć rentowności')
      }
    } catch (error) {
      console.error('Error recalculating:', error)
      toast.error('Błąd podczas przeliczania rentowności')
    } finally {
      setRecalculating(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN'
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const getMarginColor = (margin: number) => {
    if (margin >= 20) return 'text-green-600'
    if (margin >= 10) return 'text-yellow-600'
    if (margin >= 0) return 'text-orange-600'
    return 'text-red-600'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Ładowanie analizy rentowności...</p>
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
            <CurrencyDollarIcon className="h-8 w-8 text-gray-600 mr-3" />
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 sm:text-3xl">Analiza rentowności</h1>
              <p className="text-sm text-gray-600 mt-1">Szczegółowa analiza zyskowności zamówień i produktów</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value={7}>7 dni</option>
              <option value={30}>30 dni</option>
              <option value={90}>90 dni</option>
              <option value={365}>365 dni</option>
            </select>
            <button
              onClick={recalculateAll}
              disabled={recalculating}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              {recalculating ? (
                <>
                  <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                  Przeliczanie...
                </>
              ) : (
                <>
                  <ArrowPathIcon className="h-4 w-4 mr-2" />
                  Przelicz rentowność
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      {insights && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 border border-gray-200 hover:border-blue-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group">
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="flex-shrink-0 p-2 sm:p-2.5 lg:p-3 bg-blue-100 rounded-lg sm:rounded-xl shadow-lg group-hover:shadow-xl transition-shadow">
                  <ChartBarIcon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Przychody</p>
                  <p className="text-sm sm:text-lg lg:text-2xl font-bold text-gray-900">{formatCurrency(insights.totalRevenue)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 border border-gray-200 hover:border-green-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group">
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="flex-shrink-0 p-2 sm:p-2.5 lg:p-3 bg-green-100 rounded-lg sm:rounded-xl shadow-lg group-hover:shadow-xl transition-shadow">
                  <ArrowTrendingUpIcon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-green-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Zysk</p>
                  <p className="text-sm sm:text-lg lg:text-2xl font-bold text-green-600">{formatCurrency(insights.totalProfit)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 border border-gray-200 hover:border-purple-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group">
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="flex-shrink-0 p-2 sm:p-2.5 lg:p-3 bg-purple-100 rounded-lg sm:rounded-xl shadow-lg group-hover:shadow-xl transition-shadow">
                  <CurrencyDollarIcon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-purple-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Śred. marża</p>
                  <p className={`text-sm sm:text-lg lg:text-2xl font-bold ${getMarginColor(insights.averageProfitMargin)}`}>
                    {formatPercentage(insights.averageProfitMargin)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 border border-gray-200 hover:border-yellow-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group">
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="flex-shrink-0 p-2 sm:p-2.5 lg:p-3 bg-yellow-100 rounded-lg sm:rounded-xl shadow-lg group-hover:shadow-xl transition-shadow">
                  <CalendarDaysIcon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-yellow-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Zamówienia</p>
                  <p className="text-sm sm:text-lg lg:text-2xl font-bold text-gray-900">{insights.totalOrders}</p>
                  <p className="text-xs text-gray-500">
                    {insights.profitableOrders} zysk., {insights.unprofitableOrders} strat.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Struktura kosztów</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-semibold text-blue-600">
                  {formatCurrency(insights.costBreakdown.materials)}
                </div>
                <div className="text-sm text-gray-600 mt-1">Materiały</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-green-600">
                  {formatCurrency(insights.costBreakdown.labor)}
                </div>
                <div className="text-sm text-gray-600 mt-1">Praca</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-purple-600">
                  {formatCurrency(insights.costBreakdown.shipping)}
                </div>
                <div className="text-sm text-gray-600 mt-1">Wysyłka</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-orange-600">
                  {formatCurrency(insights.costBreakdown.processing)}
                </div>
                <div className="text-sm text-gray-600 mt-1">Prowizje</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-gray-600">
                  {formatCurrency(insights.costBreakdown.overhead)}
                </div>
                <div className="text-sm text-gray-600 mt-1">Ogólne</div>
              </div>
            </div>
          </div>

          {/* Top Profitable Products */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Najbardziej rentowne produkty</h2>
            </div>
            <div className="p-6">
              {insights.topProfitableProducts.length === 0 ? (
                <p className="text-gray-600 text-center py-8">Brak danych o produktach</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {insights.topProfitableProducts.slice(0, 6).map((product, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900" title={product.productName}>
                        {product.productName.length > 40 ? 
                          `${product.productName.substring(0, 40)}...` : 
                          product.productName
                        }
                      </h3>
                      <div className="mt-2 space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Zamówienia:</span>
                          <span className="font-medium">{product.orderCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Zysk całkowity:</span>
                          <span className="font-medium text-green-600">
                            {formatCurrency(product.totalProfit)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Średnia marża:</span>
                          <span className={`font-medium ${getMarginColor(product.averageMargin)}`}>
                            {formatPercentage(product.averageMargin)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Profitable vs Unprofitable Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Profitable Orders */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <ArrowTrendingUpIcon className="h-5 w-5 text-green-600 mr-2" />
              Najbardziej zyskowne zamówienia
            </h2>
          </div>
          <div className="p-6">
            {mostProfitable.length === 0 ? (
              <p className="text-gray-600 text-center py-8">Brak danych</p>
            ) : (
              <div className="space-y-3">
                {mostProfitable.slice(0, 5).map((order) => (
                  <div key={order.orderId} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <div>
                      <div className="font-medium text-gray-900">#{order.externalId}</div>
                      <div className="text-sm text-gray-600">
                        {new Date(order.orderDate).toLocaleDateString('pl-PL')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-green-600">
                        {formatCurrency(order.profit)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {formatPercentage(order.margin)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Least Profitable Orders */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <ArrowTrendingDownIcon className="h-5 w-5 text-red-600 mr-2" />
              Najmniej zyskowne zamówienia
            </h2>
          </div>
          <div className="p-6">
            {leastProfitable.length === 0 ? (
              <p className="text-gray-600 text-center py-8">Brak danych</p>
            ) : (
              <div className="space-y-3">
                {leastProfitable.slice(0, 5).map((order) => (
                  <div key={order.orderId} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                    <div>
                      <div className="font-medium text-gray-900">#{order.externalId}</div>
                      <div className="text-sm text-gray-600">
                        {new Date(order.orderDate).toLocaleDateString('pl-PL')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-red-600">
                        {formatCurrency(order.profit)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {formatPercentage(order.margin)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}