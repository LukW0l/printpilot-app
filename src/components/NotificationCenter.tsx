'use client'

import { useState } from 'react'
import { 
  BellIcon, 
  XMarkIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  ShoppingBagIcon,
  CubeIcon,
  TruckIcon
} from '@heroicons/react/24/outline'
import { useNotifications } from '@/lib/notification-context'

interface Notification {
  id: string
  type: 'info' | 'warning' | 'success' | 'error' | 'order' | 'inventory' | 'shipping'
  title: string
  message: string
  timestamp: Date | string
  read: boolean
  actionUrl?: string
  priority: 'low' | 'medium' | 'high' | 'warning'
}

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false)
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()

  const getNotificationIcon = (type: Notification['type']) => {
    const iconClass = "h-5 w-5"
    
    switch (type) {
      case 'order':
        return <ShoppingBagIcon className={`${iconClass} text-blue-500`} />
      case 'inventory':
        return <CubeIcon className={`${iconClass} text-amber-500`} />
      case 'shipping':
        return <TruckIcon className={`${iconClass} text-green-500`} />
      case 'warning':
        return <ExclamationTriangleIcon className={`${iconClass} text-amber-500`} />
      case 'error':
        return <ExclamationTriangleIcon className={`${iconClass} text-red-500`} />
      case 'success':
        return <CheckCircleIcon className={`${iconClass} text-green-500`} />
      default:
        return <InformationCircleIcon className={`${iconClass} text-blue-500`} />
    }
  }

  const getPriorityColor = (priority: Notification['priority']) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-400'
      case 'medium':
        return 'border-l-amber-400'
      default:
        return 'border-l-blue-400'
    }
  }

  const formatTime = (timestamp: Date | string) => {
    const now = new Date()
    const notificationTime = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
    const diff = now.getTime() - notificationTime.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 60) {
      return `${minutes} min temu`
    } else if (hours < 24) {
      return `${hours} godz. temu`
    } else {
      return `${days} dni temu`
    }
  }


  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id)
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl
    }
  }

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <BellIcon className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Panel */}
          <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl shadow-lg border border-gray-200 z-50 max-h-[600px] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center">
                <BellIcon className="h-5 w-5 text-gray-500 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">Powiadomienia</h3>
                {unreadCount > 0 && (
                  <span className="ml-2 bg-red-100 text-red-800 text-xs font-medium px-2 py-0.5 rounded-full">
                    {unreadCount} nowych
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Oznacz wszystkie jako przeczytane
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <BellIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-sm font-medium text-gray-900 mb-1">Brak powiadomień</h3>
                  <p className="text-sm text-gray-500">Wszystkie powiadomienia pojawią się tutaj</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors border-l-4 ${getPriorityColor(notification.priority)} ${
                        !notification.read ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                              {notification.title}
                            </p>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full ml-2"></div>
                            )}
                          </div>
                          <p className={`text-sm mt-1 ${!notification.read ? 'text-gray-700' : 'text-gray-500'}`}>
                            {notification.message}
                          </p>
                          <div className="flex items-center mt-2 text-xs text-gray-500">
                            <ClockIcon className="h-3 w-3 mr-1" />
                            {formatTime(notification.timestamp)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => {
                    setIsOpen(false)
                    window.location.href = '/dashboard/notifications'
                  }}
                  className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Zobacz wszystkie powiadomienia
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}