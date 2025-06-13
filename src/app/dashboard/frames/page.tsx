'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { formStyles } from '@/styles/form-styles'

interface FrameRequirement {
  id: string
  orderItemId: string
  frameType: 'THIN' | 'THICK'
  widthBars: number
  heightBars: number
  crossbars: number
  crossbarLength?: number
  width: number
  height: number
  frameStatus: 'NOT_PREPARED' | 'PREPARING' | 'PREPARED' | 'MOUNTED'
  preparedAt?: string
  orderItem: {
    id: string
    name: string
    quantity: number
    order: {
      externalId: string
      customerName: string
    }
  }
}

interface StockCheck {
  frameRequirementId: string
  orderItemId: string
  orderExternalId: string
  itemName: string
  quantity: number
  dimensions: string
  frameType: string
  available: boolean
  missing: Array<{
    type: string
    length: number
    required: number
    available: number
  }>
}

export default function FramesPage() {
  const [frameRequirements, setFrameRequirements] = useState<FrameRequirement[]>([])
  const [stockChecks, setStockChecks] = useState<StockCheck[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [viewMode, setViewMode] = useState<'requirements' | 'stock-check'>('requirements')

  useEffect(() => {
    fetchFrameRequirements()
  }, [selectedStatus])

  const fetchFrameRequirements = async () => {
    try {
      // Get frame requirements directly from database
      const response = await fetch('/api/frame-requirements?format=simple')
      const data = await response.json()
      
      // The API should now return an array of frame requirements with proper relations
      let requirements = Array.isArray(data) ? data : []
      
      let filtered = requirements
      if (selectedStatus !== 'all') {
        filtered = requirements.filter((req: FrameRequirement) => req.frameStatus === selectedStatus)
      }
      
      setFrameRequirements(filtered)
    } catch (error) {
      console.error('Error fetching frame requirements:', error)
      toast.error('Nie udało się pobrać wymagań ram')
      setFrameRequirements([])
    } finally {
      setLoading(false)
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
        toast.success('Wymagania ramy zostały wygenerowane')
        fetchFrameRequirements()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Nie udało się wygenerować wymagań ramy')
      }
    } catch (error) {
      toast.error('Nie udało się wygenerować wymagań ramy')
    }
  }

  const updateFrameStatus = async (id: string, frameStatus: string) => {
    try {
      const response = await fetch('/api/frame-requirements', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, frameStatus })
      })
      
      if (response.ok) {
        toast.success(`Status ramy został zmieniony na ${frameStatus.toLowerCase().replace('_', ' ')}`)
        fetchFrameRequirements()
      }
    } catch (error) {
      toast.error('Nie udało się zaktualizować statusu ramy')
    }
  }

  const checkStockAvailability = async () => {
    try {
      setLoading(true)
      const frameRequirementIds = frameRequirements.map(req => req.id)
      
      const response = await fetch('/api/frame-requirements/check-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frameRequirementIds })
      })
      
      const data = await response.json()
      setStockChecks(data.stockChecks)
      
      if (data.allAvailable) {
        toast.success('Wszystkie ramy można przygotować z obecnym stanem magazynowym')
      } else {
        toast.error(`${data.summary.unavailable} pozycji ma niewystarczający stan magazynowy`)
      }
    } catch (error) {
      toast.error('Nie udało się sprawdzić dostępności magazynowej')
    } finally {
      setLoading(false)
    }
  }

  const statusOptions = [
    { value: 'all', label: 'Wszystkie statusy' },
    { value: 'NOT_PREPARED', label: 'Nieprzygotowane' },
    { value: 'PREPARING', label: 'W przygotowaniu' },
    { value: 'PREPARED', label: 'Przygotowane' },
    { value: 'MOUNTED', label: 'Zamontowane' }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Zarządzanie ramami</h1>
          
          <div className="flex gap-2">
            <a
              href="/dashboard/frames/preparation-list"
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Lista przygotowania
            </a>
            <button
              onClick={() => setViewMode('requirements')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'requirements'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Wymagania ram
            </button>
            <button
              onClick={() => {
                setViewMode('stock-check')
                checkStockAvailability()
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'stock-check'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Sprawdzenie stanu
            </button>
          </div>
        </div>

        {/* Filters for requirements view */}
        {viewMode === 'requirements' && (
          <div className="flex gap-4 mb-6">
            <div>
              <label className={formStyles.label}>Status ramy</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className={formStyles.select}
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Summary */}
        {viewMode === 'requirements' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-blue-900 mb-2">Podsumowanie ram</h3>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-blue-700">Wszystkich pozycji:</span> {frameRequirements.length}
              </div>
              <div>
                <span className="text-blue-700">Nieprzygotowane:</span> {frameRequirements.filter(r => r.frameStatus === 'NOT_PREPARED').length}
              </div>
              <div>
                <span className="text-blue-700">W przygotowaniu:</span> {frameRequirements.filter(r => r.frameStatus === 'PREPARING').length}
              </div>
              <div>
                <span className="text-blue-700">Gotowe:</span> {frameRequirements.filter(r => r.frameStatus === 'PREPARED').length}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Frame Requirements View - Cards */}
      {viewMode === 'requirements' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {frameRequirements.map((req) => {
            const getStatusConfig = (status: string) => {
              switch (status) {
                case 'NOT_PREPARED':
                  return {
                    color: 'border-gray-300 bg-gray-50',
                    badge: 'bg-gray-100 text-gray-800',
                    icon: '⏳',
                    label: 'Nieprzygotowane'
                  }
                case 'PREPARING':
                  return {
                    color: 'border-yellow-300 bg-yellow-50',
                    badge: 'bg-yellow-100 text-yellow-800',
                    icon: '🔨',
                    label: 'W przygotowaniu'
                  }
                case 'PREPARED':
                  return {
                    color: 'border-green-300 bg-green-50',
                    badge: 'bg-green-100 text-green-800',
                    icon: '✅',
                    label: 'Przygotowane'
                  }
                case 'MOUNTED':
                  return {
                    color: 'border-blue-300 bg-blue-50',
                    badge: 'bg-blue-100 text-blue-800',
                    icon: '🖼️',
                    label: 'Zamontowane'
                  }
                default:
                  return {
                    color: 'border-gray-300 bg-gray-50',
                    badge: 'bg-gray-100 text-gray-800',
                    icon: '❓',
                    label: status
                  }
              }
            }

            const statusConfig = getStatusConfig(req.frameStatus)

            return (
              <div
                key={req.id}
                className={`rounded-xl border-2 p-6 transition-all hover:shadow-lg ${statusConfig.color}`}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <span className="text-2xl mr-2">{statusConfig.icon}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        #{req.orderItem?.order?.externalId || 'N/A'}
                      </h3>
                      <p className="text-sm text-gray-600">{req.orderItem?.order?.customerName || 'N/A'}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.badge}`}>
                    {statusConfig.label}
                  </span>
                </div>

                {/* Product Info */}
                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">{req.orderItem?.name || 'Unknown Product'}</h4>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      📐 {req.width}×{req.height}cm
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      req.frameType === 'THIN' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                    }`}>
                      {req.frameType === 'THIN' ? '📏 Cienkie' : '📏 Grube'}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      🔢 {req.orderItem?.quantity || 1} szt
                    </span>
                  </div>
                </div>

                {/* Required Materials */}
                <div className="mb-4">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">📋 Potrzebne materiały:</h5>
                  <div className="space-y-1 text-sm">
                    {req.widthBars > 0 && (
                      <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2">
                        <span className="text-gray-600">Szerokość:</span>
                        <span className="font-medium">{req.widthBars}× {req.width}cm</span>
                      </div>
                    )}
                    {req.heightBars > 0 && (
                      <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2">
                        <span className="text-gray-600">Wysokość:</span>
                        <span className="font-medium">{req.heightBars}× {req.height}cm</span>
                      </div>
                    )}
                    {req.crossbars > 0 && (
                      <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2">
                        <span className="text-gray-600">Poprzeczki:</span>
                        <span className="font-medium">{req.crossbars}× {req.crossbarLength}cm</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2">
                  {req.frameStatus === 'NOT_PREPARED' && (
                    <button
                      onClick={() => updateFrameStatus(req.id, 'PREPARING')}
                      className="w-full bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center"
                    >
                      🔨 Rozpocznij przygotowanie
                    </button>
                  )}
                  {req.frameStatus === 'PREPARING' && (
                    <button
                      onClick={() => updateFrameStatus(req.id, 'PREPARED')}
                      className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center"
                    >
                      ✅ Oznacz jako przygotowane
                    </button>
                  )}
                  {req.frameStatus === 'PREPARED' && (
                    <button
                      onClick={() => updateFrameStatus(req.id, 'MOUNTED')}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center"
                    >
                      🖼️ Oznacz jako zamontowane
                    </button>
                  )}
                  {req.frameStatus === 'MOUNTED' && (
                    <div className="w-full bg-green-100 text-green-800 px-4 py-2 rounded-lg font-medium text-center">
                      🎉 Gotowe do wysyłki
                    </div>
                  )}
                </div>

                {/* Timestamp */}
                {req.preparedAt && (
                  <div className="mt-3 text-xs text-gray-500 text-center">
                    Przygotowane: {new Date(req.preparedAt).toLocaleDateString('pl-PL')}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Stock Check View - Cards */}
      {viewMode === 'stock-check' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stockChecks.map((check) => (
              <div
                key={check.frameRequirementId}
                className={`rounded-xl border-2 p-6 transition-all hover:shadow-lg ${
                  check.available 
                    ? 'border-green-300 bg-green-50' 
                    : 'border-red-300 bg-red-50'
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <span className="text-2xl mr-2">{check.available ? '✅' : '❌'}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        #{check.orderExternalId}
                      </h3>
                      <p className="text-sm text-gray-600">{check.itemName}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    check.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {check.available ? '✅ Dostępne' : '❌ Brak'}
                  </span>
                </div>

                {/* Product Info */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      📐 {check.dimensions}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      🔢 {check.quantity} szt
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      check.frameType === 'THIN' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                    }`}>
                      📏 {check.frameType}
                    </span>
                  </div>
                </div>

                {/* Stock Status */}
                <div className="mb-4">
                  {check.available ? (
                    <div className="bg-green-100 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center text-green-800">
                        <span className="text-lg mr-2">🎉</span>
                        <span className="font-medium">Wszystkie materiały dostępne</span>
                      </div>
                      <p className="text-sm text-green-600 mt-1">
                        Rama może być przygotowana z obecnego stanu magazynowego
                      </p>
                    </div>
                  ) : (
                    <div className="bg-red-100 border border-red-200 rounded-lg p-3">
                      <div className="flex items-center text-red-800 mb-2">
                        <span className="text-lg mr-2">⚠️</span>
                        <span className="font-medium">Niewystarczający stan magazynowy</span>
                      </div>
                      <div className="space-y-2">
                        {check.missing.map((missing, idx) => (
                          <div key={idx} className="bg-white rounded-lg p-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-red-700">
                                {missing.type} {missing.length}cm
                              </span>
                              <span className="text-xs text-red-600">
                                Brakuje: {missing.required - missing.available}
                              </span>
                            </div>
                            <div className="mt-1">
                              <div className="flex justify-between text-xs text-gray-600">
                                <span>Potrzeba: {missing.required}</span>
                                <span>Mamy: {missing.available}</span>
                              </div>
                              <div className="w-full bg-red-200 rounded-full h-2 mt-1">
                                <div 
                                  className="bg-red-500 h-2 rounded-full"
                                  style={{ 
                                    width: `${Math.min((missing.available / missing.required) * 100, 100)}%` 
                                  }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Button */}
                <div className="flex flex-col gap-2">
                  {check.available ? (
                    <button className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center">
                      🚀 Można rozpocząć produkcję
                    </button>
                  ) : (
                    <button className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center">
                      📦 Zamów brakujące materiały
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Summary Stats */}
          {stockChecks.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Podsumowanie stanu magazynowego</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">✅</span>
                    <div>
                      <p className="text-sm text-green-600">Dostępne</p>
                      <p className="text-2xl font-bold text-green-800">
                        {stockChecks.filter(c => c.available).length}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">❌</span>
                    <div>
                      <p className="text-sm text-red-600">Brak materiałów</p>
                      <p className="text-2xl font-bold text-red-800">
                        {stockChecks.filter(c => !c.available).length}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">📈</span>
                    <div>
                      <p className="text-sm text-blue-600">Stopień dostępności</p>
                      <p className="text-2xl font-bold text-blue-800">
                        {stockChecks.length > 0 ? Math.round((stockChecks.filter(c => c.available).length / stockChecks.length) * 100) : 0}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {frameRequirements.length === 0 && viewMode === 'requirements' && (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Brak wymagań ram</h3>
          <p className="mt-1 text-sm text-gray-500">Wymagania ram pojawią się tutaj po wygenerowaniu.</p>
        </div>
      )}
    </div>
  )
}