'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'

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

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
  fetchNotifications: () => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void
  createOrderNotification: (orderCount: number, shopName?: string) => void
  createInventoryNotification: (itemName: string, stock: number) => void
  createSyncNotification: (orderCount: number, isError?: boolean) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/notifications?limit=20')
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      } else {
        console.error('Failed to fetch notifications')
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
      // Don't show error toast as notifications are not critical
    } finally {
      setIsLoading(false)
    }
  }, [])

  const markAsRead = useCallback(async (id: string) => {
    try {
      // Optimistic update
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))

      // Update on server
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notificationId: id,
          read: true
        })
      })

      if (!response.ok) {
        // Revert optimistic update on error
        await fetchNotifications()
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
      // Revert optimistic update on error
      await fetchNotifications()
    }
  }, [fetchNotifications])

  const markAllAsRead = useCallback(async () => {
    try {
      // Optimistic update
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)

      // In a full implementation, batch update all notifications
      // For now, just update locally
      toast.success('Wszystkie powiadomienia oznaczone jako przeczytane')
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      await fetchNotifications()
    }
  }, [fetchNotifications])

  // Helper to add local notifications (for instant feedback)
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false
    }

    setNotifications(prev => [newNotification, ...prev])
    setUnreadCount(prev => prev + 1)

    // Auto-remove after 10 seconds for local notifications
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== newNotification.id))
      setUnreadCount(prev => Math.max(0, prev - 1))
    }, 10000)
  }, [])

  // Specialized notification creators
  const createOrderNotification = useCallback((orderCount: number, shopName?: string) => {
    if (orderCount > 0) {
      const title = orderCount === 1 ? 'Nowe zamówienie' : `${orderCount} nowych zamówień`
      const message = shopName 
        ? `Zsynchronizowano ${orderCount} nowych zamówień ze sklepu "${shopName}"`
        : `Zsynchronizowano ${orderCount} nowych zamówień`

      addNotification({
        type: 'order',
        title,
        message,
        priority: orderCount >= 5 ? 'high' : 'medium',
        actionUrl: '/dashboard/orders'
      })

      // Also show toast for immediate feedback
      toast.success(message, { 
        duration: 5000,
        icon: '🛒'
      })
    }
  }, [addNotification])

  const createInventoryNotification = useCallback((itemName: string, stock: number) => {
    addNotification({
      type: 'inventory',
      title: 'Niski stan magazynu',
      message: `${itemName} - pozostało tylko ${stock} sztuk`,
      priority: stock <= 2 ? 'high' : 'warning',
      actionUrl: '/dashboard/inventory'
    })

    // Show warning toast
    toast.error(`⚠️ Niski stan: ${itemName} (${stock} szt.)`, {
      duration: 8000
    })
  }, [addNotification])

  const createSyncNotification = useCallback((orderCount: number, isError = false) => {
    if (isError) {
      addNotification({
        type: 'error',
        title: 'Błąd synchronizacji',
        message: 'Nie udało się zsynchronizować zamówień. Sprawdź połączenie ze sklepami.',
        priority: 'high',
        actionUrl: '/dashboard/shops'
      })
    } else if (orderCount > 0) {
      addNotification({
        type: 'success',
        title: 'Synchronizacja zakończona',
        message: `Automatycznie zsynchronizowano ${orderCount} nowych zamówień`,
        priority: 'medium',
        actionUrl: '/dashboard/orders'
      })
    }
  }, [addNotification])

  // Auto-refresh notifications every 30 seconds
  useEffect(() => {
    fetchNotifications()
    
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  // Listen for page visibility change to refresh notifications
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchNotifications()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [fetchNotifications])

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    isLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    addNotification,
    createOrderNotification,
    createInventoryNotification,
    createSyncNotification
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}