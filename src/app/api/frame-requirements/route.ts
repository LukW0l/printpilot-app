import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Temporarily disable auth for testing
    // const session = await getServerSession(authOptions)
    // if (!session) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const format = searchParams.get('format')

    // Najpierw pobierz wszystkie order_items z zamówień PROCESSING
    const processingOrderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          status: 'PROCESSING'
        }
      },
      include: {
        order: {
          include: {
            shop: true
          }
        },
        frameRequirement: true
      }
    })

    // Automatycznie generuj frame requirements dla elementów, które ich nie mają
    const itemsNeedingFrameReqs = processingOrderItems.filter(item => !item.frameRequirement)
    
    for (const item of itemsNeedingFrameReqs) {
      // Parse dimensions from product name
      const match = item.name.match(/(\d+)x(\d+)/)
      if (match) {
        const width = parseInt(match[1])
        const height = parseInt(match[2])
        const maxDimension = Math.max(width, height)
        
        // Determine frame type
        const frameType = maxDimension > 90 ? 'THICK' : 'THIN'
        
        // Calculate requirements
        let widthBars = 2
        let heightBars = 2
        let crossbars = 0
        let crossbarLength = null
        
        if (width > 120 || height > 120) {
          crossbars = 1
          crossbarLength = Math.min(width, height)
        }

        try {
          await prisma.frameRequirement.create({
            data: {
              orderItemId: item.id,
              frameType,
              widthBars,
              heightBars,
              crossbars,
              crossbarLength,
              width,
              height,
              frameStatus: 'NOT_PREPARED'
            }
          })
        } catch (error) {
          // Ignore duplicate errors
          console.log(`Frame requirement already exists for item ${item.id}`)
        }
      }
    }

    // Build where clause for filtering existing frame requirements
    const where: any = {}
    
    if (status && status !== 'all') {
      where.frameStatus = status
    }

    // Get all frame requirements (including newly created ones)
    const frameRequirements = await prisma.frameRequirement.findMany({
      where: {
        ...where,
        orderItem: {
          order: {
            status: 'PROCESSING'
          }
        }
      },
      include: {
        orderItem: {
          include: {
            order: {
              include: {
                shop: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    // Transform data for workshop UI
    const workshopItems = await Promise.all(
      frameRequirements.map(async (req) => {
        const orderItem = req.orderItem
        const order = orderItem.order
        
        // Calculate urgency based on order date and delivery expectations
        const orderAge = Date.now() - new Date(order.orderDate).getTime()
        const daysSinceOrder = Math.floor(orderAge / (1000 * 60 * 60 * 24))
        
        let urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
        if (daysSinceOrder >= 7) urgency = 'URGENT'
        else if (daysSinceOrder >= 4) urgency = 'HIGH'
        else if (daysSinceOrder >= 2) urgency = 'MEDIUM'
        else urgency = 'LOW'

        // Check material availability - MULTIPLY by order quantity
        const stretcherBarsNeeded = [
          { length: req.width, type: req.frameType, quantity: req.widthBars * orderItem.quantity },
          { length: req.height, type: req.frameType, quantity: req.heightBars * orderItem.quantity }
        ]

        const stretcherBarAvailability = await Promise.all(
          stretcherBarsNeeded.map(async (bar) => {
            const inventory = await prisma.stretcherBarInventory.findUnique({
              where: {
                length_type: {
                  length: bar.length,
                  type: bar.type
                }
              }
            })
            return {
              ...bar,
              available: inventory?.stock || 0
            }
          })
        )

        const crossbarAvailability = req.crossbars > 0 && req.crossbarLength ? 
          await prisma.crossbarInventory.findUnique({
            where: { length: req.crossbarLength }
          }) : null

        const crossbars = req.crossbars > 0 && req.crossbarLength ? [{
          length: req.crossbarLength,
          quantity: req.crossbars * orderItem.quantity,
          available: crossbarAvailability?.stock || 0
        }] : []

        // Check if all materials are available
        const materialsAvailable = stretcherBarAvailability.every(bar => bar.available >= bar.quantity) &&
          (crossbars.length === 0 || crossbars.every(cb => cb.available >= cb.quantity))

        // Calculate missing materials
        const missingMaterials: string[] = []
        stretcherBarAvailability.forEach(bar => {
          if (bar.available < bar.quantity) {
            missingMaterials.push(`${bar.length}cm ${bar.type} (${bar.quantity - bar.available} szt)`)
          }
        })
        crossbars.forEach(cb => {
          if (cb.available < cb.quantity) {
            missingMaterials.push(`${cb.length}cm crossbar (${cb.quantity - cb.available} szt)`)
          }
        })

        // Estimate work time (basic calculation)
        const baseTime = 30 // base minutes per frame
        const sizeMultiplier = (req.width * req.height) / (100 * 70) // relative to 100x70cm
        const complexityBonus = req.crossbars > 0 ? 15 : 0
        const estimatedMinutes = Math.round((baseTime * sizeMultiplier + complexityBonus) * orderItem.quantity)

        return {
          id: req.id,
          orderItemId: orderItem.id,
          orderExternalId: order.externalId,
          customerName: order.customerName,
          itemName: orderItem.name,
          dimensions: `${req.width}×${req.height}cm`,
          quantity: orderItem.quantity,
          frameType: req.frameType,
          urgency,
          deliveryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now as estimate
          status: req.frameStatus,
          materialsAvailable,
          missingMaterials,
          estimatedMinutes,
          assignedTo: req.frameStatus === 'PREPARING' ? 'Workshop User' : undefined,
          stretcherBars: stretcherBarAvailability,
          crossbars,
          createdAt: req.createdAt.toISOString(),
          printStatus: orderItem.printStatus
        }
      })
    )

    // Filter by priority if specified
    const filteredItems = priority && priority !== 'all' 
      ? workshopItems.filter(item => item.urgency === priority)
      : workshopItems

    // Handle simple format for frames page
    if (format === 'simple') {
      // Get frame requirements with proper relations for frames page
      const simpleFrameRequirements = await prisma.frameRequirement.findMany({
        where: {
          orderItem: {
            order: {
              status: 'PROCESSING'
            }
          }
        },
        include: {
          orderItem: {
            include: {
              order: true
            }
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      })

      return NextResponse.json(simpleFrameRequirements)
    }

    return NextResponse.json({
      items: filteredItems,
      stats: {
        total: workshopItems.length,
        queue: workshopItems.filter(item => item.status === 'NOT_PREPARED').length,
        prep: workshopItems.filter(item => item.status === 'PREPARING').length,
        ready: workshopItems.filter(item => item.status === 'PREPARED').length,
        urgent: workshopItems.filter(item => item.urgency === 'URGENT').length,
        needsMaterials: workshopItems.filter(item => !item.materialsAvailable).length,
        canStart: workshopItems.filter(item => item.materialsAvailable && item.status === 'NOT_PREPARED').length
      }
    })
  } catch (error) {
    console.error('Error fetching frame requirements:', error)
    return NextResponse.json(
      { error: 'Failed to fetch frame requirements' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Temporarily disable auth for testing
    // const session = await getServerSession(authOptions)
    // if (!session) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const body = await request.json()
    const { orderItemId } = body

    // Get the order item with its details
    const orderItem = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        order: true
      }
    })

    if (!orderItem) {
      return NextResponse.json({ error: 'Order item not found' }, { status: 404 })
    }

    // Check if frame requirement already exists
    const existingFrameReq = await prisma.frameRequirement.findUnique({
      where: { orderItemId }
    })

    if (existingFrameReq) {
      return NextResponse.json({ 
        message: 'Frame requirement already exists',
        frameRequirement: existingFrameReq 
      })
    }

    // Parse dimensions from product name
    function parseDimensions(name: string) {
      const match = name.match(/(\d+)x(\d+)/)
      if (!match) return null
      return {
        width: parseInt(match[1]),
        height: parseInt(match[2])
      }
    }

    // Calculate frame requirements
    function calculateFrameRequirements(dimensions: { width: number; height: number }) {
      const { width, height } = dimensions
      const maxDimension = Math.max(width, height)
      
      // Determine frame type: if any dimension > 90cm, use THICK
      const frameType = maxDimension > 90 ? 'THICK' : 'THIN'
      
      // Basic frame needs 2 bars of each dimension
      let widthBars = 2
      let heightBars = 2
      let crossbars = 0
      let crossbarLength = null
      
      // Check if we need crossbars (for dimensions > 120cm)
      if (width > 120 || height > 120) {
        crossbars = 1
        crossbarLength = Math.min(width, height)
      }
      
      return {
        frameType,
        widthBars,
        heightBars,
        crossbars,
        crossbarLength,
        width,
        height
      }
    }

    const dimensions = parseDimensions(orderItem.name)
    if (!dimensions) {
      return NextResponse.json({ 
        error: 'Could not parse dimensions from product name' 
      }, { status: 400 })
    }

    const frameReq = calculateFrameRequirements(dimensions)

    // Create frame requirement
    const frameRequirement = await prisma.frameRequirement.create({
      data: {
        orderItemId,
        frameType: frameReq.frameType as 'THIN' | 'THICK',
        widthBars: frameReq.widthBars,
        heightBars: frameReq.heightBars,
        crossbars: frameReq.crossbars,
        crossbarLength: frameReq.crossbarLength,
        width: frameReq.width,
        height: frameReq.height,
        frameStatus: 'NOT_PREPARED'
      }
    })

    return NextResponse.json({
      message: 'Frame requirement created successfully',
      frameRequirement
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating frame requirement:', error)
    return NextResponse.json(
      { error: 'Failed to create frame requirement' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, frameStatus } = body

    if (!id || !frameStatus) {
      return NextResponse.json({ 
        error: 'Missing required fields: id and frameStatus' 
      }, { status: 400 })
    }

    // Update frame requirement status
    const updatedFrameRequirement = await prisma.frameRequirement.update({
      where: { id },
      data: {
        frameStatus,
        updatedAt: new Date()
      },
      include: {
        orderItem: {
          include: {
            order: true
          }
        }
      }
    })

    return NextResponse.json({
      message: 'Frame requirement updated successfully',
      frameRequirement: updatedFrameRequirement
    })

  } catch (error) {
    console.error('Error updating frame requirement:', error)
    return NextResponse.json(
      { error: 'Failed to update frame requirement' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Temporarily disable auth for testing
    // const session = await getServerSession(authOptions)
    // if (!session) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const body = await request.json()
    const { id, status } = body

    if (!id || !status) {
      return NextResponse.json({ 
        error: 'Missing required fields: id and status' 
      }, { status: 400 })
    }

    // Get the frame requirement with related data
    const frameRequirement = await prisma.frameRequirement.findUnique({
      where: { id },
      include: {
        orderItem: {
          include: {
            order: true
          }
        }
      }
    })

    if (!frameRequirement) {
      return NextResponse.json({ error: 'Frame requirement not found' }, { status: 404 })
    }

    // If marking as PREPARED, deduct materials from inventory
    if (status === 'PREPARED' && frameRequirement.frameStatus !== 'PREPARED') {
      console.log(`Preparing frame ${frameRequirement.id} - deducting materials from inventory`)
      
      // Calculate materials needed
      const stretcherBarsNeeded = [
        { length: frameRequirement.width, type: frameRequirement.frameType, quantity: frameRequirement.widthBars },
        { length: frameRequirement.height, type: frameRequirement.frameType, quantity: frameRequirement.heightBars }
      ]

      // Deduct stretcher bars from inventory
      for (const bar of stretcherBarsNeeded) {
        const inventory = await prisma.stretcherBarInventory.findUnique({
          where: {
            length_type: {
              length: bar.length,
              type: bar.type
            }
          }
        })

        if (!inventory || inventory.stock < bar.quantity) {
          return NextResponse.json({
            error: `Insufficient stock for ${bar.length}cm ${bar.type} bars. Need: ${bar.quantity}, Available: ${inventory?.stock || 0}`
          }, { status: 400 })
        }

        // Update inventory
        await prisma.stretcherBarInventory.update({
          where: {
            length_type: {
              length: bar.length,
              type: bar.type
            }
          },
          data: {
            stock: {
              decrement: bar.quantity
            }
          }
        })

        // Create inventory transaction log
        await prisma.inventoryTransaction.create({
          data: {
            type: 'USED',
            itemType: 'STRETCHER_BAR',
            itemId: `${bar.length}cm-${bar.type}`,
            quantity: bar.quantity,
            description: `Used for frame preparation - Order ${frameRequirement.orderItem.order.externalId}`,
            frameRequirementId: frameRequirement.id
          }
        })

        console.log(`Deducted ${bar.quantity} units of ${bar.length}cm ${bar.type} bars`)
      }

      // Deduct crossbars if needed
      if (frameRequirement.crossbars > 0 && frameRequirement.crossbarLength) {
        const crossbarInventory = await prisma.crossbarInventory.findUnique({
          where: { length: frameRequirement.crossbarLength }
        })

        if (!crossbarInventory || crossbarInventory.stock < frameRequirement.crossbars) {
          return NextResponse.json({
            error: `Insufficient stock for ${frameRequirement.crossbarLength}cm crossbars. Need: ${frameRequirement.crossbars}, Available: ${crossbarInventory?.stock || 0}`
          }, { status: 400 })
        }

        // Update crossbar inventory
        await prisma.crossbarInventory.update({
          where: { length: frameRequirement.crossbarLength },
          data: {
            stock: {
              decrement: frameRequirement.crossbars
            }
          }
        })

        // Create inventory transaction log
        await prisma.inventoryTransaction.create({
          data: {
            type: 'USED',
            itemType: 'CROSSBAR',
            itemId: `${frameRequirement.crossbarLength}cm`,
            quantity: frameRequirement.crossbars,
            description: `Used for frame preparation - Order ${frameRequirement.orderItem.order.externalId}`,
            frameRequirementId: frameRequirement.id
          }
        })

        console.log(`Deducted ${frameRequirement.crossbars} units of ${frameRequirement.crossbarLength}cm crossbars`)
      }
    }

    // Update frame requirement status
    const updatedFrameRequirement = await prisma.frameRequirement.update({
      where: { id },
      data: {
        frameStatus: status,
        updatedAt: new Date()
      },
      include: {
        orderItem: {
          include: {
            order: true
          }
        }
      }
    })

    return NextResponse.json({
      message: 'Frame requirement updated successfully',
      frameRequirement: updatedFrameRequirement
    })

  } catch (error) {
    console.error('Error updating frame requirement:', error)
    return NextResponse.json(
      { error: 'Failed to update frame requirement' },
      { status: 500 }
    )
  }
}