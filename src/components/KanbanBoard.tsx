'use client'

import { useState } from 'react'
import { 
  ClockIcon,
  CogIcon,
  PrinterIcon,
  TruckIcon,
  CheckCircleIcon,
  XMarkIcon,
  PlusIcon,
  EllipsisHorizontalIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface Order {
  id: string
  externalId: string
  customerName: string
  customerEmail: string
  status: string
  totalAmount: number
  currency: string
  orderDate: string
  priority: 'low' | 'medium' | 'high'
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

interface KanbanColumn {
  id: string
  title: string
  icon: any
  color: string
  orders: Order[]
  limit?: number
}

interface KanbanBoardProps {
  orders: Order[]
  onOrderMove: (orderId: string, newStatus: string) => void
}

export default function KanbanBoard({ orders, onOrderMove }: KanbanBoardProps) {
  const [draggedOrder, setDraggedOrder] = useState<string | null>(null)

  const columns: KanbanColumn[] = [
    {
      id: 'NEW',
      title: 'Nowe zamówienia',
      icon: ClockIcon,
      color: 'border-blue-500 bg-blue-50',
      orders: orders.filter(order => order.status === 'NEW')
    },
    {
      id: 'PROCESSING',
      title: 'W realizacji',
      icon: CogIcon,
      color: 'border-amber-500 bg-amber-50',
      orders: orders.filter(order => order.status === 'PROCESSING'),
      limit: 10
    },
    {
      id: 'PRINTED',
      title: 'Wydrukowane',
      icon: PrinterIcon,
      color: 'border-purple-500 bg-purple-50',
      orders: orders.filter(order => order.status === 'PRINTED')
    },
    {
      id: 'SHIPPED',
      title: 'Wysłane',
      icon: TruckIcon,
      color: 'border-green-500 bg-green-50',
      orders: orders.filter(order => order.status === 'SHIPPED')
    },
    {
      id: 'DELIVERED',
      title: 'Dostarczone',
      icon: CheckCircleIcon,
      color: 'border-emerald-500 bg-emerald-50',
      orders: orders.filter(order => order.status === 'DELIVERED')
    },
    {
      id: 'CANCELLED',
      title: 'Anulowane',
      icon: XMarkIcon,
      color: 'border-red-500 bg-red-50',
      orders: orders.filter(order => order.status === 'CANCELLED')
    }
  ]

  const handleDragStart = (e: React.DragEvent, orderId: string) => {
    setDraggedOrder(orderId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, columnId: string) => {
    e.preventDefault()
    if (draggedOrder && draggedOrder !== columnId) {
      const order = orders.find(o => o.id === draggedOrder)
      if (order && order.status !== columnId) {
        onOrderMove(draggedOrder, columnId)
        toast.success(`Zamówienie przeniesione do "${columns.find(c => c.id === columnId)?.title}"`)
      }
    }
    setDraggedOrder(null)
  }

  const getPriorityIndicator = (priority: string) => {
    switch (priority) {
      case 'high':
        return <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
      case 'medium':
        return <div className="w-2 h-2 bg-amber-400 rounded-full" />
      default:
        return <div className="w-2 h-2 bg-blue-400 rounded-full" />
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 60) return `${diffInMinutes}min temu`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h temu`
    return `${Math.floor(diffInMinutes / 1440)} dni temu`
  }

  return (
    <div className="h-[calc(100vh-200px)] overflow-hidden">
      <div className="flex space-x-6 h-full overflow-x-auto pb-6">
        {columns.map((column) => {
          const Icon = column.icon
          const isOverLimit = column.limit && column.orders.length > column.limit
          
          return (
            <div
              key={column.id}
              className={`flex-shrink-0 w-80 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-2xl border-2 border-dashed shadow-sm hover:shadow-lg transition-all duration-300 ${
                draggedOrder ? 'border-indigo-300 shadow-lg' : 'border-transparent'
              }`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              {/* Column Header */}
              <div className={`px-4 py-4 rounded-t-2xl border-l-4 ${column.color} bg-white/80 backdrop-blur-sm`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white rounded-xl shadow-sm">
                      <Icon className="h-5 w-5 text-gray-700" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{column.title}</h3>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                        isOverLimit ? 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300' : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300'
                      }`}>
                        {column.orders.length}
                        {column.limit && ` / ${column.limit}`}
                      </span>
                    </div>
                  </div>
                  <button className="p-2 hover:bg-white hover:bg-opacity-70 rounded-xl transition-all duration-200 hover:shadow-sm">
                    <EllipsisHorizontalIcon className="h-4 w-4 text-gray-500" />
                  </button>
                </div>
                {isOverLimit && (
                  <div className="mt-3 text-xs text-red-700 bg-gradient-to-r from-red-100 to-red-200 px-3 py-2 rounded-xl border border-red-300 font-medium">
                    ⚠️ Przekroczono limit kolumny
                  </div>
                )}
              </div>

              {/* Column Content */}
              <div className="p-4 space-y-3 h-full overflow-y-auto">
                {column.orders.map((order) => {
                  const daysSinceOrder = Math.floor(
                    (Date.now() - new Date(order.orderDate).getTime()) / (1000 * 60 * 60 * 24)
                  )
                  const isOverdue = daysSinceOrder > 3 && ['NEW', 'PROCESSING'].includes(order.status)
                  
                  return (
                    <div
                      key={order.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, order.id)}
                      className={`bg-white rounded-xl border border-gray-100 p-4 cursor-move hover:shadow-xl hover:border-indigo-200 transition-all duration-300 transform hover:-translate-y-1 group ${
                        draggedOrder === order.id ? 'opacity-50 scale-95 shadow-lg' : 'shadow-sm'
                      } ${isOverdue ? 'ring-2 ring-red-300 bg-gradient-to-r from-red-50 to-red-100/50 border-red-200' : ''}`}
                    >
                      {/* Order Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          {getPriorityIndicator(order.priority)}
                          <div className="text-sm font-semibold text-gray-900">
                            #{order.externalId}
                          </div>
                          {isOverdue && (
                            <div className="text-xs bg-red-100 text-red-800 px-1.5 py-0.5 rounded">
                              OPÓŹNIONE
                            </div>
                          )}
                        </div>
                        <button 
                          onClick={() => window.location.href = `/dashboard/orders/${order.id}`}
                          className="text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </button>
                      </div>

                      {/* Customer Info */}
                      <div className="space-y-2 mb-3">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{order.customerName}</div>
                          <div className="text-xs text-gray-500 truncate">{order.customerEmail}</div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold text-gray-900">
                            {Number(order.totalAmount).toFixed(2)} {order.currency}
                          </div>
                          <div className="flex items-center space-x-1">
                            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                              {order.shop.name}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Items Preview */}
                      <div className="space-y-1 mb-3">
                        {order.items.slice(0, 2).map((item, index) => (
                          <div key={index} className="text-xs text-gray-600 flex justify-between">
                            <span className="truncate flex-1">{item.name}</span>
                            <span className="ml-2">{item.quantity}x</span>
                          </div>
                        ))}
                        {order.items.length > 2 && (
                          <div className="text-xs text-gray-500">
                            +{order.items.length - 2} więcej pozycji
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <div className="text-xs text-gray-500">
                          {formatTimeAgo(order.orderDate)}
                        </div>
                        <div className="flex items-center space-x-1">
                          {order.priority === 'high' && (
                            <span className="text-xs text-red-600">🔥</span>
                          )}
                          <span className="text-xs text-gray-500">
                            {order.items.length} pozycji
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* Add New Order Button */}
                {column.id === 'NEW' && (
                  <button className="w-full border-2 border-dashed border-indigo-300 rounded-xl p-4 text-indigo-600 hover:border-indigo-400 hover:text-indigo-700 hover:bg-indigo-50 transition-all duration-300 flex items-center justify-center space-x-2 font-medium">
                    <PlusIcon className="h-5 w-5" />
                    <span className="text-sm">Dodaj zamówienie</span>
                  </button>
                )}

                {/* Empty State */}
                {column.orders.length === 0 && column.id !== 'NEW' && (
                  <div className="text-center py-8 text-gray-400">
                    <div className="p-4 bg-gray-100 rounded-xl mx-auto w-fit mb-3">
                      <Icon className="h-12 w-12 mx-auto opacity-50" />
                    </div>
                    <p className="text-sm font-medium">Brak zamówień</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}