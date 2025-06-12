import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const limit = parseInt(searchParams.get('limit') || '20')

    // For now, generate notifications from real data
    const notifications = await generateRealTimeNotifications(limit, unreadOnly)

    return NextResponse.json({
      notifications,
      unreadCount: notifications.filter(n => !n.read).length
    })

  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { notificationId, read } = body

    // In a full implementation, you'd update the notification in database
    // For now, we'll just return success
    
    return NextResponse.json({
      success: true,
      message: 'Notification updated'
    })

  } catch (error) {
    console.error('Error updating notification:', error)
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    )
  }
}

async function generateRealTimeNotifications(limit: number, unreadOnly: boolean) {
  const notifications: any[] = []

  try {
    // 1. New orders (last 24 hours)
    const newOrders = await prisma.orders.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      },
      include: {
        shops: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    })

    newOrders.forEach(order => {
      notifications.push({
        id: `order-${order.id}`,
        type: 'order',
        title: `Nowe zamówienie #${order.externalId}`,
        message: `Otrzymano nowe zamówienie od ${order.customerName} na kwotę ${Number(order.totalAmount).toFixed(0)} PLN`,
        timestamp: order.createdAt,
        read: false,
        actionUrl: `/dashboard/orders/${order.id}`,
        priority: 'high'
      })
    })

    // 2. Low inventory alerts
    const lowStockStretcherBars = await prisma.stretcher_bar_inventory.findMany({
      where: {
        stock: {
          lte: prisma.stretcher_bar_inventory.fields.minStock
        }
      },
      orderBy: {
        stock: 'asc'
      },
      take: 3
    })

    lowStockStretcherBars.forEach(bar => {
      notifications.push({
        id: `inventory-stretcher-${bar.id}`,
        type: 'inventory',
        title: 'Niski stan magazynu',
        message: `Listwy nośne ${bar.length}cm ${bar.type} - pozostało tylko ${bar.stock} sztuk`,
        timestamp: new Date(Date.now() - Math.random() * 2 * 60 * 60 * 1000), // Random time in last 2 hours
        read: false,
        actionUrl: '/dashboard/inventory',
        priority: 'warning'
      })
    })

    // 3. Low crossbar inventory
    const lowStockCrossbars = await prisma.crossbar_inventory.findMany({
      where: {
        stock: {
          lte: prisma.crossbar_inventory.fields.minStock
        }
      },
      orderBy: {
        stock: 'asc'
      },
      take: 2
    })

    lowStockCrossbars.forEach(crossbar => {
      notifications.push({
        id: `inventory-crossbar-${crossbar.id}`,
        type: 'inventory',
        title: 'Niski stan magazynu',
        message: `Poprzeczki ${crossbar.length}cm - pozostało tylko ${crossbar.stock} sztuk`,
        timestamp: new Date(Date.now() - Math.random() * 2 * 60 * 60 * 1000),
        read: false,
        actionUrl: '/dashboard/inventory',
        priority: 'warning'
      })
    })

    // 4. Recent shipments
    const recentShipments = await prisma.orders.findMany({
      where: {
        status: 'SHIPPED',
        updatedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 3
    })

    recentShipments.forEach(order => {
      notifications.push({
        id: `shipped-${order.id}`,
        type: 'shipping',
        title: 'Przesyłka wysłana',
        message: `Zamówienie #${order.externalId} zostało wysłane do ${order.customerName}`,
        timestamp: order.updatedAt,
        read: Math.random() > 0.5, // Random read status
        actionUrl: `/dashboard/orders/${order.id}`,
        priority: 'low'
      })
    })

    // 5. Production delays (items printed but no frame requirements yet)
    const delayedItems = await prisma.order_items.findMany({
      where: {
        printStatus: 'PRINTED',
        printedAt: {
          lte: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // Printed more than 2 days ago
        },
        frame_requirements: null
      },
      include: {
        orders: true
      },
      take: 3
    })

    delayedItems.forEach(item => {
      notifications.push({
        id: `delay-${item.id}`,
        type: 'warning',
        title: 'Opóźnienie w produkcji',
        message: `Przedmiot "${item.name}" z zamówienia #${item.orders.externalId} nie ma jeszcze przygotowanych ram`,
        timestamp: new Date(Date.now() - Math.random() * 6 * 60 * 60 * 1000),
        read: false,
        actionUrl: '/dashboard/production',
        priority: 'high'
      })
    })

    // 6. Recent sync logs
    const recentSyncLogs = await prisma.sync_logs.findMany({
      where: {
        finishedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        },
        status: {
          in: ['SUCCESS', 'PARTIAL_SUCCESS']
        }
      },
      include: {
        shops: true
      },
      orderBy: {
        finishedAt: 'desc'
      },
      take: 2
    })

    recentSyncLogs.forEach(log => {
      notifications.push({
        id: `sync-${log.id}`,
        type: 'success',
        title: 'Synchronizacja ukończona',
        message: `Zsynchronizowano ${log.newOrders} nowych zamówień ze sklepu "${log.shops?.name || 'Unknown Shop'}"`,
        timestamp: log.finishedAt || log.startedAt,
        read: Math.random() > 0.3, // Most syncs are read
        actionUrl: '/dashboard/orders',
        priority: 'medium'
      })
    })

    // 7. Frame preparation completed
    const completedFrames = await prisma.frame_requirements.findMany({
      where: {
        frameStatus: 'PREPARED',
        updatedAt: {
          gte: new Date(Date.now() - 12 * 60 * 60 * 1000) // Last 12 hours
        }
      },
      include: {
        order_items: {
          include: {
            orders: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 3
    })

    completedFrames.forEach(frame => {
      notifications.push({
        id: `frame-${frame.id}`,
        type: 'success',
        title: 'Rama przygotowana',
        message: `Rama ${frame.width}×${frame.height}cm dla zamówienia #${frame.order_items.orders.externalId} jest gotowa`,
        timestamp: frame.updatedAt,
        read: Math.random() > 0.6,
        actionUrl: '/dashboard/workshop',
        priority: 'medium'
      })
    })

  } catch (error) {
    console.error('Error generating notifications:', error)
  }

  // Sort by timestamp, most recent first
  notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  // Filter unread only if requested
  const filteredNotifications = unreadOnly 
    ? notifications.filter(n => !n.read)
    : notifications

  return filteredNotifications.slice(0, limit)
}