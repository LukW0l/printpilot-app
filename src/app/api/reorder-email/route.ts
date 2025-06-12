import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { recipientEmail, includeAllLowStock = true, customItems = [] } = body
    
    if (!recipientEmail) {
      return NextResponse.json(
        { error: 'Recipient email is required' },
        { status: 400 }
      )
    }
    
    let itemsToOrder = []
    
    if (includeAllLowStock) {
      // Get all low stock items
      const stretcherBars = await prisma.stretcher_bar_inventory.findMany({
        where: {
          stock: {
            lte: prisma.stretcher_bar_inventory.fields.minStock
          }
        }
      })
      
      const crossbars = await prisma.crossbar_inventory.findMany({
        where: {
          stock: {
            lte: prisma.crossbar_inventory.fields.minStock
          }
        }
      })
      
      // Add stretcher bars to order list
      stretcherBars.forEach(bar => {
        const deficit = Math.max(0, bar.minStock - bar.stock)
        if (deficit > 0) {
          itemsToOrder.push({
            type: 'stretcher',
            frameType: bar.type,
            length: bar.length,
            currentStock: bar.stock,
            minStock: bar.minStock,
            deficit,
            orderQuantity: deficit + Math.round(deficit * 0.2) // Add 20% buffer
          })
        }
      })
      
      // Add crossbars to order list
      crossbars.forEach(crossbar => {
        const deficit = Math.max(0, crossbar.minStock - crossbar.stock)
        if (deficit > 0) {
          itemsToOrder.push({
            type: 'crossbar',
            length: crossbar.length,
            currentStock: crossbar.stock,
            minStock: crossbar.minStock,
            deficit,
            orderQuantity: deficit + Math.round(deficit * 0.2) // Add 20% buffer
          })
        }
      })
    }
    
    // Add custom items if provided
    if (customItems && customItems.length > 0) {
      itemsToOrder.push(...customItems)
    }
    
    if (itemsToOrder.length === 0) {
      return NextResponse.json(
        { error: 'No items to order' },
        { status: 400 }
      )
    }
    
    // Generate email content
    const emailSubject = `Frame Component Reorder Request - ${new Date().toLocaleDateString()}`
    
    let emailBody = `Dear Supplier,\n\n`
    emailBody += `Please process the following frame component orders:\n\n`
    
    const stretcherItems = itemsToOrder.filter(item => item.type === 'stretcher')
    const crossbarItems = itemsToOrder.filter(item => item.type === 'crossbar')
    
    if (stretcherItems.length > 0) {
      emailBody += `STRETCHER BARS:\n`
      emailBody += `================\n`
      stretcherItems.forEach(item => {
        emailBody += `- ${item.frameType} ${item.length}cm: ${item.orderQuantity} pieces\n`
        emailBody += `  (Current: ${item.currentStock}, Min: ${item.minStock}, Deficit: ${item.deficit})\n\n`
      })
    }
    
    if (crossbarItems.length > 0) {
      emailBody += `CROSSBARS:\n`
      emailBody += `==========\n`
      crossbarItems.forEach(item => {
        emailBody += `- ${item.length}cm: ${item.orderQuantity} pieces\n`
        emailBody += `  (Current: ${item.currentStock}, Min: ${item.minStock}, Deficit: ${item.deficit})\n\n`
      })
    }
    
    const totalItems = itemsToOrder.reduce((sum, item) => sum + item.orderQuantity, 0)
    
    emailBody += `ORDER SUMMARY:\n`
    emailBody += `==============\n`
    emailBody += `Total Items: ${itemsToOrder.length} different components\n`
    emailBody += `Total Pieces: ${totalItems}\n`
    emailBody += `Order Date: ${new Date().toLocaleString()}\n`
    emailBody += `Requested Delivery: ASAP\n\n`
    
    emailBody += `Please confirm receipt of this order and provide estimated delivery date.\n\n`
    emailBody += `Thank you,\n`
    emailBody += `PrintPilot Production Team\n`
    emailBody += `Generated automatically by PrintPilot system`
    
    // In a real implementation, you would send this via email service (SendGrid, Nodemailer, etc.)
    // For now, we'll return the email content for manual sending
    
    const emailData = {
      to: recipientEmail,
      subject: emailSubject,
      body: emailBody,
      itemsToOrder,
      summary: {
        totalComponents: itemsToOrder.length,
        totalPieces: totalItems,
        stretcherBars: stretcherItems.length,
        crossbars: crossbarItems.length,
        generatedAt: new Date().toISOString()
      }
    }
    
    // TODO: Log this reorder request in the database for tracking
    // await prisma.reorderRequest.create({ data: { ... } })
    
    return NextResponse.json({
      success: true,
      message: 'Reorder email generated successfully',
      email: emailData
    })
    
  } catch (error) {
    console.error('Error generating reorder email:', error)
    return NextResponse.json(
      { error: 'Failed to generate reorder email' },
      { status: 500 }
    )
  }
}

// Helper endpoint to get email template for specific items
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const itemIds = searchParams.get('itemIds')?.split(',') || []
    const type = searchParams.get('type') // 'stretcher' or 'crossbar'
    
    if (itemIds.length === 0 && !type) {
      return NextResponse.json(
        { error: 'Either itemIds or type parameter is required' },
        { status: 400 }
      )
    }
    
    let items = []
    
    if (type === 'stretcher' || !type) {
      const stretcherBars = await prisma.stretcher_bar_inventory.findMany({
        where: itemIds.length > 0 ? { id: { in: itemIds } } : {},
        orderBy: [{ type: 'asc' }, { length: 'asc' }]
      })
      
      items.push(...stretcherBars.map(bar => ({
        id: bar.id,
        type: 'stretcher',
        frameType: bar.type,
        length: bar.length,
        currentStock: bar.stock,
        minStock: bar.minStock,
        deficit: Math.max(0, bar.minStock - bar.stock),
        isLowStock: bar.stock <= bar.minStock
      })))
    }
    
    if (type === 'crossbar' || !type) {
      const crossbars = await prisma.crossbar_inventory.findMany({
        where: itemIds.length > 0 ? { id: { in: itemIds } } : {},
        orderBy: { length: 'asc' }
      })
      
      items.push(...crossbars.map(crossbar => ({
        id: crossbar.id,
        type: 'crossbar',
        length: crossbar.length,
        currentStock: crossbar.stock,
        minStock: crossbar.minStock,
        deficit: Math.max(0, crossbar.minStock - crossbar.stock),
        isLowStock: crossbar.stock <= crossbar.minStock
      })))
    }
    
    const lowStockItems = items.filter(item => item.isLowStock)
    
    return NextResponse.json({
      items,
      lowStockItems,
      summary: {
        totalItems: items.length,
        lowStockItems: lowStockItems.length,
        stretcherBars: items.filter(item => item.type === 'stretcher').length,
        crossbars: items.filter(item => item.type === 'crossbar').length
      }
    })
    
  } catch (error) {
    console.error('Error fetching reorder template data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reorder template data' },
      { status: 500 }
    )
  }
}