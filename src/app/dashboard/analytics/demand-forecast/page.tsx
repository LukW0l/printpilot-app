'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { 
  ChartPieIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  CubeIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

interface ForecastData {
  frameWidth: number
  frameHeight: number
  productType: string
  weekOfYear: number
  year: number
  forecastedDemand: number
  confidence: number
  seasonalityFactor: number
  averageWeeklyDemand: number
  lastOrderDate?: string
}

interface ShortageAlert {
  frameWidth: number
  frameHeight: number
  productType: string
  currentStock: number
  forecastedDemand: number
  daysUntilShortage: number
  recommendedOrder: number
}

export default function DemandForecastPage() {
  const [forecasts, setForecasts] = useState<ForecastData[]>([])
  const [shortages, setShortages] = useState<ShortageAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [weeksAhead, setWeeksAhead] = useState(4)

  useEffect(() => {
    fetchForecasts()
    fetchShortages()
  }, [weeksAhead])

  const fetchForecasts = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/analytics/demand-forecast?action=upcoming&weeks=${weeksAhead}`)
      const data = await response.json()
      if (data.success) {
        setForecasts(data.data)
      }
    } catch (error) {
      console.error('Error fetching forecasts:', error)
      toast.error('Nie udało się pobrać prognoz')
    } finally {
      setLoading(false)
    }
  }

  const fetchShortages = async () => {
    try {
      const response = await fetch('/api/analytics/demand-forecast?action=shortages')
      const data = await response.json()
      if (data.success) {
        setShortages(data.data)
      }
    } catch (error) {
      console.error('Error fetching shortages:', error)
    }
  }

  const generateNewForecasts = async () => {
    try {
      setGenerating(true)
      const response = await fetch('/api/analytics/demand-forecast?action=generate&weeks=' + weeksAhead)
      const data = await response.json()
      if (data.success) {
        toast.success(`Wygenerowano ${data.data.length} nowych prognoz`)
        fetchForecasts()
        fetchShortages()
      } else {
        toast.error('Nie udało się wygenerować prognoz')
      }
    } catch (error) {
      console.error('Error generating forecasts:', error)
      toast.error('Błąd podczas generowania prognoz')
    } finally {
      setGenerating(false)
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100'
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getSeasonalityIcon = (factor: number) => {
    if (factor > 1.2) return '📈'
    if (factor < 0.8) return '📉'
    return '➖'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Ładowanie prognoz popytu...</p>
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
            <ChartPieIcon className="h-8 w-8 text-gray-600 mr-3" />
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 sm:text-3xl">Prognozowanie popytu</h1>
              <p className="text-sm text-gray-600 mt-1">Analiza i predykcja zapotrzebowania na podstawie danych historycznych</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={weeksAhead}
              onChange={(e) => setWeeksAhead(parseInt(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value={2}>2 tygodnie</option>
              <option value={4}>4 tygodnie</option>
              <option value={8}>8 tygodni</option>
              <option value={12}>12 tygodni</option>
            </select>
            <button
              onClick={generateNewForecasts}
              disabled={generating}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              {generating ? (
                <>
                  <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                  Generowanie...
                </>
              ) : (
                <>
                  <ArrowPathIcon className="h-4 w-4 mr-2" />
                  Wygeneruj prognozy
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Shortage Alerts */}
      {shortages.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center mb-4">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mr-2" />
            <h2 className="text-lg font-semibold text-red-900">Alerty o potencjalnych brakach</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {shortages.slice(0, 6).map((shortage, index) => (
              <div key={index} className="bg-white border border-red-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">
                    {shortage.productType} {shortage.frameWidth}×{shortage.frameHeight}cm
                  </h3>
                  <span className="text-xs text-red-600 font-medium">
                    {shortage.daysUntilShortage} dni
                  </span>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Stan obecny:</span>
                    <span className="font-medium">{shortage.currentStock} szt.</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Prognoza tygodniowa:</span>
                    <span className="font-medium">{shortage.forecastedDemand} szt.</span>
                  </div>
                  <div className="flex justify-between text-blue-600">
                    <span>Zalecane zamówienie:</span>
                    <span className="font-medium">{shortage.recommendedOrder} szt.</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {shortages.length > 6 && (
            <p className="mt-4 text-sm text-red-600">
              ...oraz {shortages.length - 6} innych alertów
            </p>
          )}
        </div>
      )}

      {/* Forecasts Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ChartPieIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Prognozy aktywne</p>
              <p className="text-2xl font-semibold text-gray-900">{forecasts.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <ArrowTrendingUpIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Średnia pewność</p>
              <p className="text-2xl font-semibold text-gray-900">
                {forecasts.length > 0 
                  ? Math.round((forecasts.reduce((sum, f) => sum + f.confidence, 0) / forecasts.length) * 100)
                  : 0
                }%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Alerty braków</p>
              <p className="text-2xl font-semibold text-gray-900">{shortages.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Forecasts Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Prognozy popytu na najbliższe {weeksAhead} tygodni
          </h2>
        </div>

        {forecasts.length === 0 ? (
          <div className="p-12 text-center">
            <ChartPieIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Brak prognoz</h3>
            <p className="text-gray-600 mb-6">
              Brak dostępnych prognoz popytu. Wygeneruj nowe prognozy na podstawie danych historycznych.
            </p>
            <button
              onClick={generateNewForecasts}
              disabled={generating}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {generating ? (
                <>
                  <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                  Generowanie...
                </>
              ) : (
                <>
                  <ArrowPathIcon className="h-4 w-4 mr-2" />
                  Wygeneruj prognozy
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Produkt
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Wymiary
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tydzień
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prognoza
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pewność
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sezonowość
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Średnia tygodniowa
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {forecasts.map((forecast, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {forecast.productType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {forecast.frameWidth}×{forecast.frameHeight}cm
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <CalendarDaysIcon className="h-4 w-4 text-gray-400 mr-2" />
                        {forecast.weekOfYear}/{forecast.year}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="font-semibold">{forecast.forecastedDemand}</span> szt.
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getConfidenceColor(forecast.confidence)}`}>
                        {Math.round(forecast.confidence * 100)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <span className="mr-2">{getSeasonalityIcon(forecast.seasonalityFactor)}</span>
                        {forecast.seasonalityFactor.toFixed(2)}x
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {forecast.averageWeeklyDemand.toFixed(1)} szt.
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}