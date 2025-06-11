'use client'

import React, { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import toast from 'react-hot-toast'

interface WorkshopItem {
  id: string
  orderExternalId: string
  customerName: string
  itemName: string
  dimensions: string
  quantity: number
  frameType: 'THIN' | 'THICK'
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  deliveryDate: string
  status: 'QUEUE' | 'PREP' | 'READY' | 'MOUNTED'
  materialsAvailable: boolean
  missingMaterials: string[]
  estimatedMinutes: number
  assignedTo?: string
  stretcherBars: Array<{
    length: number
    type: 'THIN' | 'THICK'
    quantity: number
    available: number
  }>
  crossbars: Array<{
    length: number
    quantity: number
    available: number
  }>
}

const MOCK_DATA: WorkshopItem[] = [
  {
    id: '1',
    orderExternalId: 'ORDER-001',
    customerName: 'Jan Kowalski',
    itemName: 'Canvas Print - Abstract Art',
    dimensions: '120×80cm',
    quantity: 1,
    frameType: 'THICK',
    urgency: 'HIGH',
    deliveryDate: '2025-06-05',
    status: 'QUEUE',
    materialsAvailable: true,
    missingMaterials: [],
    estimatedMinutes: 45,
    stretcherBars: [
      { length: 120, type: 'THICK', quantity: 2, available: 42 },
      { length: 80, type: 'THICK', quantity: 2, available: 6 }
    ],
    crossbars: []
  },
  {
    id: '2',
    orderExternalId: 'ORDER-002',
    customerName: 'Anna Nowak',
    itemName: 'Wall Art - Nature Photography',
    dimensions: '100×70cm',
    quantity: 2,
    frameType: 'THICK',
    urgency: 'MEDIUM',
    deliveryDate: '2025-06-06',
    status: 'PREP',
    materialsAvailable: true,
    missingMaterials: [],
    estimatedMinutes: 30,
    assignedTo: 'Marek',
    stretcherBars: [
      { length: 100, type: 'THICK', quantity: 4, available: 41 },
      { length: 70, type: 'THICK', quantity: 4, available: 30 }
    ],
    crossbars: []
  },
  {
    id: '3',
    orderExternalId: 'ORDER-003',
    customerName: 'Piotr Wiśniewski',
    itemName: 'Large Canvas - Landscape',
    dimensions: '160×120cm',
    quantity: 1,
    frameType: 'THICK',
    urgency: 'URGENT',
    deliveryDate: '2025-06-04',
    status: 'QUEUE',
    materialsAvailable: false,
    missingMaterials: ['160cm THICK (1 szt)', '120cm crossbar (1 szt)'],
    estimatedMinutes: 60,
    stretcherBars: [
      { length: 160, type: 'THICK', quantity: 2, available: 1 },
      { length: 120, type: 'THICK', quantity: 2, available: 42 }
    ],
    crossbars: [
      { length: 120, quantity: 1, available: 0 }
    ]
  }
]

export default function WorkshopPage() {
  const [items, setItems] = useState<WorkshopItem[]>(MOCK_DATA)
  const [selectedWorker, setSelectedWorker] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')

  const urgencyColors = {
    LOW: 'bg-gray-100 border-gray-300 text-gray-700',
    MEDIUM: 'bg-blue-100 border-blue-300 text-blue-700',
    HIGH: 'bg-orange-100 border-orange-300 text-orange-700',
    URGENT: 'bg-red-100 border-red-300 text-red-700'
  }

  const statusColumns = [
    { id: 'QUEUE', title: 'KOLEJKA', color: 'bg-gray-50' },
    { id: 'PREP', title: 'W PRZYGOTOWANIU', color: 'bg-yellow-50' },
    { id: 'READY', title: 'GOTOWE', color: 'bg-green-50' },
    { id: 'MOUNTED', title: 'ZAMONTOWANE', color: 'bg-blue-50' }
  ]

  const handleDragEnd = (result: any) => {
    if (!result.destination) return

    const newStatus = result.destination.droppableId as WorkshopItem['status']
    const itemId = result.draggableId

    setItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId
          ? { 
              ...item, 
              status: newStatus,
              assignedTo: newStatus === 'PREP' ? 'Obecny użytkownik' : item.assignedTo
            }
          : item
      )
    )

    toast.success(`Blejtram przeniesiony do: ${statusColumns.find(col => col.id === newStatus)?.title}`)
  }

  const getFilteredItems = () => {
    return items.filter(item => {
      if (selectedWorker !== 'all' && item.assignedTo !== selectedWorker) return false
      if (filterPriority !== 'all' && item.urgency !== filterPriority) return false
      return true
    })
  }

  const getTodayStats = () => {
    const today = new Date().toISOString().split('T')[0]
    const todayItems = items.filter(item => item.deliveryDate === today)
    
    return {
      total: items.length,
      urgent: items.filter(item => item.urgency === 'URGENT').length,
      ready: items.filter(item => item.status === 'READY').length,
      inProgress: items.filter(item => item.status === 'PREP').length,
      needsMaterials: items.filter(item => !item.materialsAvailable).length
    }
  }

  const stats = getTodayStats()
  const filteredItems = getFilteredItems()

  return (
    <div className="p-4 max-w-7xl mx-auto">
      {/* Header z statystykami */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-gray-900">🔨 Warsztat Blejtramów</h1>
          <div className="text-sm text-gray-500">
            {new Date().toLocaleDateString('pl-PL', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
        </div>

        {/* Statystyki dzisiejszej pracy */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg border p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">Wszystkich</div>
          </div>
          <div className="bg-red-50 rounded-lg border border-red-200 p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.urgent}</div>
            <div className="text-sm text-red-600">Pilnych</div>
          </div>
          <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.inProgress}</div>
            <div className="text-sm text-yellow-600">W realizacji</div>
          </div>
          <div className="bg-green-50 rounded-lg border border-green-200 p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.ready}</div>
            <div className="text-sm text-green-600">Gotowych</div>
          </div>
          <div className="bg-orange-50 rounded-lg border border-orange-200 p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.needsMaterials}</div>
            <div className="text-sm text-orange-600">Brak materiałów</div>
          </div>
        </div>

        {/* Filtry */}
        <div className="flex gap-4 mb-6">
          <select
            value={selectedWorker}
            onChange={(e) => setSelectedWorker(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Wszyscy pracownicy</option>
            <option value="Marek">Marek</option>
            <option value="Obecny użytkownik">Moja praca</option>
          </select>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Wszystkie priorytety</option>
            <option value="URGENT">Tylko pilne</option>
            <option value="HIGH">Wysokie</option>
            <option value="MEDIUM">Średnie</option>
          </select>

          <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
            📊 Eksportuj listę cięcia
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-4 gap-4">
          {statusColumns.map(column => (
            <div key={column.id} className={`${column.color} rounded-lg p-4 min-h-96`}>
              <h3 className="font-semibold text-gray-900 mb-4 text-center">
                {column.title}
                <span className="ml-2 bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs">
                  {filteredItems.filter(item => item.status === column.id).length}
                </span>
              </h3>

              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`space-y-3 min-h-8 ${
                      snapshot.isDraggingOver ? 'bg-blue-100 rounded-lg' : ''
                    }`}
                  >
                    {filteredItems
                      .filter(item => item.status === column.id)
                      .map((item, index) => (
                        <Draggable key={item.id} draggableId={item.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`
                                bg-white rounded-lg border-2 p-4 shadow-sm
                                ${urgencyColors[item.urgency]}
                                ${snapshot.isDragging ? 'shadow-lg rotate-2' : 'hover:shadow-md'}
                                ${!item.materialsAvailable ? 'border-l-4 border-l-red-500' : ''}
                                cursor-grab active:cursor-grabbing
                              `}
                            >
                              {/* Header z zamówieniem */}
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <div className="font-bold text-sm">{item.orderExternalId}</div>
                                  <div className="text-xs text-gray-600">{item.customerName}</div>
                                </div>
                                <div className="flex flex-col items-end">
                                  <span className={`
                                    px-2 py-1 rounded-full text-xs font-medium
                                    ${item.urgency === 'URGENT' ? 'bg-red-100 text-red-700' :
                                      item.urgency === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                                      item.urgency === 'MEDIUM' ? 'bg-blue-100 text-blue-700' :
                                      'bg-gray-100 text-gray-700'}
                                  `}>
                                    {item.urgency === 'URGENT' ? '🔥 PILNE' :
                                     item.urgency === 'HIGH' ? '⚡ WYSOKIE' :
                                     item.urgency === 'MEDIUM' ? '📅 ŚREDNIE' : '📋 NORMALNE'}
                                  </span>
                                  <div className="text-xs text-gray-500 mt-1">
                                    📅 {new Date(item.deliveryDate).toLocaleDateString('pl-PL')}
                                  </div>
                                </div>
                              </div>

                              {/* Nazwa produktu */}
                              <div className="text-sm font-medium mb-2">
                                {item.itemName}
                              </div>

                              {/* Wymiary i ilość */}
                              <div className="flex justify-between items-center mb-3">
                                <span className="text-lg font-bold text-blue-600">
                                  {item.dimensions}
                                </span>
                                <span className="bg-gray-100 px-2 py-1 rounded text-sm">
                                  x{item.quantity}
                                </span>
                              </div>

                              {/* Materiały potrzebne */}
                              <div className="mb-3">
                                <div className="text-xs font-medium text-gray-700 mb-1">Potrzebne materiały:</div>
                                {item.stretcherBars.map((bar, idx) => (
                                  <div key={idx} className="flex justify-between text-xs">
                                    <span>{bar.quantity}× {bar.length}cm {bar.type}</span>
                                    <span className={bar.available >= bar.quantity ? 'text-green-600' : 'text-red-600'}>
                                      {bar.available >= bar.quantity ? '✅' : `❌ (${bar.available}/${bar.quantity})`}
                                    </span>
                                  </div>
                                ))}
                                {item.crossbars.map((crossbar, idx) => (
                                  <div key={idx} className="flex justify-between text-xs">
                                    <span>{crossbar.quantity}× poprzeczka {crossbar.length}cm</span>
                                    <span className={crossbar.available >= crossbar.quantity ? 'text-green-600' : 'text-red-600'}>
                                      {crossbar.available >= crossbar.quantity ? '✅' : `❌ (${crossbar.available}/${crossbar.quantity})`}
                                    </span>
                                  </div>
                                ))}
                              </div>

                              {/* Braki materiałów */}
                              {!item.materialsAvailable && (
                                <div className="bg-red-50 border border-red-200 rounded p-2 mb-3">
                                  <div className="text-xs font-medium text-red-700 mb-1">⚠️ Brakuje:</div>
                                  {item.missingMaterials.map((material, idx) => (
                                    <div key={idx} className="text-xs text-red-600">• {material}</div>
                                  ))}
                                </div>
                              )}

                              {/* Footer z czasem i przypisaniem */}
                              <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                                <span className="text-xs text-gray-500">
                                  ⏱️ ~{item.estimatedMinutes} min
                                </span>
                                {item.assignedTo && (
                                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                    👤 {item.assignedTo}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      {/* Szybkie akcje */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2">
        <button className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-full shadow-lg transition-colors">
          📦 Zamów brakujące
        </button>
        <button className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-colors">
          📋 Lista cięcia
        </button>
        <button className="bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-full shadow-lg transition-colors">
          📊 Raport dnia
        </button>
      </div>
    </div>
  )
}