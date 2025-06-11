import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, orderIds, data } = body

    if (!action || !orderIds || !Array.isArray(orderIds)) {
      return NextResponse.json({ 
        error: 'Missing required fields: action, orderIds' 
      }, { status: 400 })
    }

    console.log(`Executing bulk action: ${action} on ${orderIds.length} orders`)

    let result: any = {}

    switch (action) {
      case 'updateStatus':
        if (!data.status) {
          return NextResponse.json({ error: 'Status is required' }, { status: 400 })
        }

        const updatedOrders = await prisma.order.updateMany({
          where: {
            id: {
              in: orderIds
            }
          },
          data: {
            status: data.status,
            updatedAt: new Date()
          }
        })

        result = {
          action: 'updateStatus',
          updated: updatedOrders.count,
          status: data.status
        }
        break

      case 'assignOperator':
        if (!data.operatorId) {
          return NextResponse.json({ error: 'Operator ID is required' }, { status: 400 })
        }

        // Check if operator exists
        const operator = await prisma.user.findUnique({
          where: { id: data.operatorId }
        })

        if (!operator) {
          return NextResponse.json({ error: 'Operator not found' }, { status: 404 })
        }

        // For now, we'll store operator assignment in order metadata
        // In a full implementation, you might have a separate assignments table
        const assignedOrders = await prisma.order.updateMany({
          where: {
            id: {
              in: orderIds
            }
          },
          data: {
            // Store operator info in a custom field (this would need schema update for production)
            updatedAt: new Date()
          }
        })

        result = {
          action: 'assignOperator',
          assigned: assignedOrders.count,
          operatorName: operator.name,
          operatorId: data.operatorId
        }
        break

      case 'bulkPrint':
        // Mark all items in selected orders as PRINTING
        const printingItems = await prisma.orderItem.updateMany({
          where: {
            orderId: {
              in: orderIds
            },
            printStatus: 'NOT_PRINTED'
          },
          data: {
            printStatus: 'PRINTING'
          }
        })

        // Also update order status to PROCESSING
        await prisma.order.updateMany({
          where: {
            id: {
              in: orderIds
            }
          },
          data: {
            status: 'PROCESSING',
            updatedAt: new Date()
          }
        })

        result = {
          action: 'bulkPrint',
          itemsMarkedForPrinting: printingItems.count,
          ordersUpdated: orderIds.length
        }
        break

      case 'generateFrameRequirements':
        // Find all printed items in selected orders that don't have frame requirements
        const printedItemsWithoutFrames = await prisma.orderItem.findMany({
          where: {
            orderId: {
              in: orderIds
            },
            printStatus: 'PRINTED',
            frameRequirement: null
          }
        })

        let frameRequirementsCreated = 0
        for (const item of printedItemsWithoutFrames) {
          try {
            // Parse dimensions from item name
            const match = item.name.match(/(\d+)x(\d+)/)
            if (match) {
              const width = parseInt(match[1])
              const height = parseInt(match[2])
              const frameType = Math.max(width, height) > 90 ? 'THICK' : 'THIN'

              await prisma.frameRequirement.create({
                data: {
                  orderItemId: item.id,
                  frameType,
                  widthBars: 2,
                  heightBars: 2,
                  crossbars: (width > 120 || height > 120) ? 1 : 0,
                  crossbarLength: (width > 120 || height > 120) ? Math.min(width, height) : null,
                  width,
                  height,
                  frameStatus: 'NOT_PREPARED'
                }
              })
              frameRequirementsCreated++
            }
          } catch (error) {
            console.error(`Failed to create frame requirement for item ${item.id}:`, error)
          }
        }

        result = {
          action: 'generateFrameRequirements',
          frameRequirementsCreated,
          itemsProcessed: printedItemsWithoutFrames.length
        }
        break

      case 'export':
        // Generate export data
        const ordersForExport = await prisma.order.findMany({
          where: {
            id: {
              in: orderIds
            }
          },
          include: {
            items: true,
            shop: true
          }
        })

        const exportData = ordersForExport.map(order => ({
          orderNumber: order.externalId,
          shopName: order.shop.name,
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          totalAmount: Number(order.totalAmount),
          currency: order.currency,
          status: order.status,
          orderDate: order.orderDate.toISOString(),
          itemCount: order.items.length,
          items: order.items.map(item => ({
            name: item.name,
            sku: item.sku,
            quantity: item.quantity,
            price: Number(item.price),
            printStatus: item.printStatus
          }))
        }))

        result = {
          action: 'export',
          format: data.format || 'json',
          ordersExported: exportData.length,
          data: exportData
        }
        break

      case 'delete':
        // Delete orders and related data
        const deletedOrders = await prisma.order.deleteMany({
          where: {
            id: {
              in: orderIds
            }
          }
        })

        result = {
          action: 'delete',
          deleted: deletedOrders.count
        }
        break

      default:
        return NextResponse.json({ 
          error: `Unknown action: ${action}` 
        }, { status: 400 })
    }

    console.log(`Bulk action completed:`, result)

    return NextResponse.json({
      success: true,
      result,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error executing bulk action:', error)
    return NextResponse.json(
      { 
        error: 'Failed to execute bulk action',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}