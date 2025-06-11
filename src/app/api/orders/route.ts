import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status')
    const shopId = searchParams.get('shopId')
    const search = searchParams.get('search')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const days = searchParams.get('days') // Quick filter for last N days
    
    console.log('📋 API /orders called with:', { status, limit, page })
    console.log('🗄️ DATABASE_URL:', process.env.DATABASE_URL)
    console.log('📂 Current working directory:', process.cwd())

    const where: any = {}
    
    // Status filtering
    if (status) {
      // Handle multiple statuses separated by comma
      if (status.includes(',')) {
        where.status = { in: status.split(',') }
      } else {
        where.status = status
      }
    }
    
    // Shop filtering
    if (shopId) where.shopId = shopId
    
    // Search filtering
    if (search) {
      where.OR = [
        { externalId: { contains: search } },
        { customerName: { contains: search } },
        { customerEmail: { contains: search } }
      ]
    }

    // Date filtering - default to last 30 days if no date params provided
    const now = new Date()
    let dateFilter: any = {}

    if (days) {
      // Quick filter: last N days
      const daysAgo = new Date()
      daysAgo.setDate(now.getDate() - parseInt(days))
      dateFilter = {
        orderDate: {
          gte: daysAgo,
          lte: now
        }
      }
    } else if (dateFrom || dateTo) {
      // Custom date range
      if (dateFrom && dateTo) {
        dateFilter = {
          orderDate: {
            gte: new Date(dateFrom),
            lte: new Date(dateTo)
          }
        }
      } else if (dateFrom) {
        dateFilter = {
          orderDate: {
            gte: new Date(dateFrom)
          }
        }
      } else if (dateTo) {
        dateFilter = {
          orderDate: {
            lte: new Date(dateTo)
          }
        }
      }
    } else {
      // Default: last 30 days (only if no explicit "all" parameter)
      // EXCEPTION: Always show all PROCESSING orders (they need to be completed)
      const showAll = searchParams.get('all')
      const isProcessingStatus = status === 'PROCESSING' || (status && status.includes('PROCESSING'))
      
      if (!showAll && !isProcessingStatus) {
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(now.getDate() - 30)
        dateFilter = {
          orderDate: {
            gte: thirtyDaysAgo,
            lte: now
          }
        }
      }
    }

    // Apply date filter if defined
    if (Object.keys(dateFilter).length > 0) {
      Object.assign(where, dateFilter)
    }

    // Debug: Test basic connection first
    try {
      const orderCount = await prisma.order.count()
      console.log('🔢 Total orders in database:', orderCount)
    } catch (countError) {
      console.error('❌ Error counting orders:', countError)
      throw countError
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: {
          select: {
            id: true,
            name: true,
            sku: true,
            quantity: true,
            price: true,
            imageUrl: true,
            productType: true,
            dimensions: true,
            printStatus: true,
            printedAt: true,
            completedCount: true,
            completionStatus: true,
            frameRequirement: {
              select: {
                width: true,
                height: true,
                frameType: true
              }
            }
          }
        },
        shop: {
          select: {
            name: true,
            platform: true
          }
        }
      },
      orderBy: {
        orderDate: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit
    })
    
    // Debug: log actual data returned from database
    if (orders.length > 0) {
      console.log('📦 Sample order items from database:', orders[0].externalId, 
        orders[0].items.map(item => ({ name: item.name, printStatus: item.printStatus })))
    }

    const total = await prisma.order.count({ where })
    
    // Get total count without date filtering for comparison
    const whereWithoutDate = { ...where }
    delete whereWithoutDate.orderDate
    const totalAllTime = await prisma.order.count({ where: whereWithoutDate })

    // Determine applied date range for frontend display
    let dateRangeInfo = null
    if (Object.keys(dateFilter).length > 0) {
      const isDefault = !days && !dateFrom && !dateTo && !searchParams.get('all')
      dateRangeInfo = {
        isDefault,
        days: days ? parseInt(days) : (isDefault ? 30 : null),
        dateFrom: dateFrom,
        dateTo: dateTo,
        filtered: total,
        totalAllTime
      }
    }

    const response = NextResponse.json({
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      dateRange: dateRangeInfo
    })
    
    // Add no-cache headers to prevent stale data
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    
    return response
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const order = await prisma.order.create({
      data: {
        ...body,
        items: {
          create: body.items
        }
      },
      include: {
        items: true,
        shop: true
      }
    })

    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    console.error('Error creating order:', error)
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    )
  }
}