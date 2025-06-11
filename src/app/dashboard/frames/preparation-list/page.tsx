'use client'

import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

interface FrameListItem {
  type: 'stretcher' | 'crossbar'
  frameType?: 'THIN' | 'THICK'
  length: number
  totalQuantity: number
  currentStock: number
  available: boolean
  deficit: number
  orders: Array<{
    orderExternalId: string
    customerName: string
    itemName: string
    quantity: number
    dimensions: string
  }>
}

interface PreparationListData {
  summary: {
    totalFrameRequirements: number
    totalOrders: number
    stretcherBarsNeeded: number
    crossbarsNeeded: number
    allAvailable: boolean
    totalDeficit: number
    missingItems: number
  }
  stretcherBars: FrameListItem[]
  crossbars: FrameListItem[]
  frameRequirements: Array<{
    id: string
    orderExternalId: string
    customerName: string
    itemName: string
    dimensions: string
    frameType: string
    quantity: number
    frameStatus: string
  }>
}

export default function FramePreparationListPage() {
  const [data, setData] = useState<PreparationListData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState('NOT_PREPARED')
  const [viewMode, setViewMode] = useState<'summary' | 'detailed'>('summary')
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchPreparationList()
  }, [selectedStatus])

  const fetchPreparationList = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/frame-preparation-list?status=${selectedStatus}`)
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Error fetching preparation list:', error)
      toast.error('Nie udało się pobrać listy przygotowania')
    } finally {
      setLoading(false)
    }
  }

  const toggleExpanded = (key: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(key)) {
      newExpanded.delete(key)
    } else {
      newExpanded.add(key)
    }
    setExpandedItems(newExpanded)
  }

  const exportPreparationList = () => {
    if (!data) return

    let csvContent = "Typ,Typ ramy,Długość (cm),Potrzebna ilość,Aktualny stan,Dostępne,Deficyt\n"
    
    // Add stretcher bars
    data.stretcherBars.forEach(item => {
      csvContent += `Listwa nosząca,${item.frameType},${item.length},${item.totalQuantity},${item.currentStock},${item.available ? 'Tak' : 'Nie'},${item.deficit}\n`
    })
    
    // Add crossbars
    data.crossbars.forEach(item => {
      csvContent += `Poprzeczka,,${item.length},${item.totalQuantity},${item.currentStock},${item.available ? 'Tak' : 'Nie'},${item.deficit}\n`
    })

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `frame-preparation-list-${selectedStatus.toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
    
    toast.success('Lista przygotowania została wyeksportowana')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!data) {
    return <div className="p-6">Brak dostępnych danych</div>
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Lista przygotowania ram</h1>
          
          <div className="flex gap-4 items-center">
            <button
              onClick={exportPreparationList}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Eksportuj CSV
            </button>
            
            <div className="flex bg-gray-200 rounded-lg p-1">
              <button
                onClick={() => setViewMode('summary')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'summary' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Podsumowanie
              </button>
              <button
                onClick={() => setViewMode('detailed')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'detailed' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Szczegółowo
              </button>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status ramy</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="NOT_PREPARED">Nieprzygotowane</option>
              <option value="PREPARING">W przygotowaniu</option>
              <option value="PREPARED">Przygotowane</option>
            </select>
          </div>
        </div>

        {/* Summary */}
        <div className={`border rounded-lg p-4 mb-6 ${
          data.summary.allAvailable ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
        }`}>
          <h3 className={`font-medium mb-2 ${
            data.summary.allAvailable ? 'text-green-900' : 'text-red-900'
          }`}>
            Podsumowanie przygotowania
          </h3>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <span className={data.summary.allAvailable ? 'text-green-700' : 'text-red-700'}>
                Wymagania ram:
              </span> {data.summary.totalFrameRequirements}
            </div>
            <div>
              <span className={data.summary.allAvailable ? 'text-green-700' : 'text-red-700'}>
                Zamówienia:
              </span> {data.summary.totalOrders}
            </div>
            <div>
              <span className={data.summary.allAvailable ? 'text-green-700' : 'text-red-700'}>
                Listwy noszące:
              </span> {data.summary.stretcherBarsNeeded}
            </div>
            <div>
              <span className={data.summary.allAvailable ? 'text-green-700' : 'text-red-700'}>
                Poprzeczki:
              </span> {data.summary.crossbarsNeeded}
            </div>
          </div>
          {!data.summary.allAvailable && (
            <div className="mt-3 pt-3 border-t border-red-200 text-sm">
              <span className="text-red-700 font-medium">
                {data.summary.missingItems} pozycji brakuje, całkowity deficyt: {data.summary.totalDeficit} sztuk
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Summary View */}
      {viewMode === 'summary' && (
        <div className="space-y-6">
          {/* Stretcher Bars */}
          {data.stretcherBars.length > 0 && (
            <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Wymagane listwy noszące</h3>
              </div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Typ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Długość
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Potrzebne
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      W magazynie
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Zamówienia
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.stretcherBars.map((item, idx) => {
                    const key = `stretcher_${item.frameType}_${item.length}`
                    const isExpanded = expandedItems.has(key)
                    
                    return (
                      <React.Fragment key={key}>
                        <tr className={`hover:bg-gray-50 ${!item.available ? 'bg-red-50' : ''}`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              item.frameType === 'THIN' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                            }`}>
                              {item.frameType}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.length}cm
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-lg font-semibold text-gray-900">
                            {item.totalQuantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                            {item.currentStock}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              item.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {item.available ? 'Dostępne' : `Potrzeba ${item.deficit} więcej`}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <button
                              onClick={() => toggleExpanded(key)}
                              className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                            >
                              {item.orders.length} zamówień {isExpanded ? '−' : '+'}
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={6} className="px-6 py-4 bg-gray-50">
                              <div className="space-y-2">
                                {item.orders.map((order, orderIdx) => (
                                  <div key={orderIdx} className="flex justify-between items-center text-sm">
                                    <div>
                                      <span className="font-medium">#{order.orderExternalId}</span> - {order.customerName}
                                    </div>
                                    <div className="text-gray-500">
                                      {order.itemName} ({order.dimensions}) × {order.quantity}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Crossbars */}
          {data.crossbars.length > 0 && (
            <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Wymagane poprzeczki</h3>
              </div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Długość
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Potrzebne
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      W magazynie
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Zamówienia
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.crossbars.map((item, idx) => {
                    const key = `crossbar_${item.length}`
                    const isExpanded = expandedItems.has(key)
                    
                    return (
                      <React.Fragment key={key}>
                        <tr className={`hover:bg-gray-50 ${!item.available ? 'bg-red-50' : ''}`}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.length}cm
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-lg font-semibold text-gray-900">
                            {item.totalQuantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                            {item.currentStock}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              item.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {item.available ? 'Dostępne' : `Potrzeba ${item.deficit} więcej`}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <button
                              onClick={() => toggleExpanded(key)}
                              className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                            >
                              {item.orders.length} zamówień {isExpanded ? '−' : '+'}
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={5} className="px-6 py-4 bg-gray-50">
                              <div className="space-y-2">
                                {item.orders.map((order, orderIdx) => (
                                  <div key={orderIdx} className="flex justify-between items-center text-sm">
                                    <div>
                                      <span className="font-medium">#{order.orderExternalId}</span> - {order.customerName}
                                    </div>
                                    <div className="text-gray-500">
                                      {order.itemName} ({order.dimensions}) × {order.quantity}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Detailed View */}
      {viewMode === 'detailed' && (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Szczegóły wymagań ram</h3>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Zamówienie
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pozycja
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Wymiary
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Typ ramy
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ilość
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.frameRequirements.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">#{req.orderExternalId}</div>
                      <div className="text-sm text-gray-500">{req.customerName}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{req.itemName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {req.dimensions}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      req.frameType === 'THIN' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                    }`}>
                      {req.frameType}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-lg font-semibold text-gray-900">{req.quantity}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      req.frameStatus === 'NOT_PREPARED' ? 'bg-gray-100 text-gray-800' :
                      req.frameStatus === 'PREPARING' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {req.frameStatus.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.summary.totalFrameRequirements === 0 && (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Brak wymagań ram</h3>
          <p className="mt-1 text-sm text-gray-500">Nie znaleziono wymagań ram dla statusu: {selectedStatus.toLowerCase().replace('_', ' ')}</p>
        </div>
      )}
    </div>
  )
}