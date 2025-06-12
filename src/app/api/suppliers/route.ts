import { NextRequest, NextResponse } from 'next/server'
import { SupplierManager, addSupplier, getSuppliers, getSupplierStats, findBestSupplier } from '@/lib/supplier-manager'
import { requireAuth, requireAdmin, validateRequestBody, addSecurityHeaders, sanitizeError } from '@/lib/auth-middleware'
import { supplierSchema, paginationSchema, apiActionSchema } from '@/lib/validation-schemas'

export async function GET(request: NextRequest) {
  try {
    // Authentication required for all supplier operations
    const authResult = await requireAuth(request)
    if (authResult instanceof NextResponse) {
      return addSecurityHeaders(authResult)
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'list'
    const id = searchParams.get('id')
    const category = searchParams.get('category') as any
    const activeOnly = searchParams.get('active_only') !== 'false'
    
    const manager = new SupplierManager()
    
    switch (action) {
      case 'list':
        // Lista dostawców
        const suppliers = await getSuppliers(category, activeOnly)
        return NextResponse.json({
          success: true,
          data: suppliers,
          count: suppliers.length
        })
        
      case 'get':
        // Konkretny dostawca
        if (!id) {
          return NextResponse.json({
            error: 'Supplier ID is required'
          }, { status: 400 })
        }
        
        const supplier = await manager.getSupplier(id)
        if (!supplier) {
          return NextResponse.json({
            error: 'Supplier not found'
          }, { status: 404 })
        }
        
        return NextResponse.json({
          success: true,
          data: supplier
        })
        
      case 'stats':
        // Statystyki dostawców
        const stats = await getSupplierStats()
        return NextResponse.json({
          success: true,
          data: stats
        })
        
      case 'products':
        // Produkty dostawcy
        if (!id) {
          return NextResponse.json({
            error: 'Supplier ID is required'
          }, { status: 400 })
        }
        
        const supplierProductCategory = searchParams.get('product_category')
        const inStockOnly = searchParams.get('in_stock_only') === 'true'
        
        const products = await manager.getSupplierProducts(id, supplierProductCategory || undefined, inStockOnly)
        return NextResponse.json({
          success: true,
          data: products,
          count: products.length
        })
        
      case 'orders':
        // Zamówienia dostawcy
        const status = searchParams.get('status') as any
        const days = searchParams.get('days') ? parseInt(searchParams.get('days')!) : undefined
        
        const orders = await manager.getSupplierOrders(id || undefined, status, days)
        return NextResponse.json({
          success: true,
          data: orders,
          count: orders.length
        })
        
      case 'find_best':
        // Znajdź najlepszego dostawcę dla produktu
        const bestProductCategory = searchParams.get('product_category')
        if (!bestProductCategory) {
          return NextResponse.json({
            error: 'product_category is required'
          }, { status: 400 })
        }
        
        const width = searchParams.get('width') ? parseInt(searchParams.get('width')!) : undefined
        const height = searchParams.get('height') ? parseInt(searchParams.get('height')!) : undefined
        const thickness = searchParams.get('thickness') ? parseInt(searchParams.get('thickness')!) : undefined
        
        const bestSupplier = await findBestSupplier(bestProductCategory, { width, height, thickness })
        return NextResponse.json({
          success: true,
          data: bestSupplier
        })
        
      default:
        return NextResponse.json({
          error: 'Invalid action parameter'
        }, { status: 400 })
    }
    
  } catch (error) {
    console.error('Error in suppliers GET:', error)
    const response = NextResponse.json({
      success: false,
      error: 'Failed to process supplier request',
      details: sanitizeError(error, process.env.NODE_ENV === 'development')
    }, { status: 500 })
    
    return addSecurityHeaders(response)
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authentication required for all POST operations
    const authResult = await requireAuth(request)
    if (authResult instanceof NextResponse) {
      return addSecurityHeaders(authResult)
    }

    // Parse request body once
    const body = await request.json()
    const { action } = body
    
    // Validate that action is present
    if (!action || typeof action !== 'string') {
      const response = NextResponse.json({
        success: false,
        error: 'Action is required',
      }, { status: 400 })
      return addSecurityHeaders(response)
    }
    
    const manager = new SupplierManager()
    
    switch (action) {
      case 'create':
        // Validate supplier data with Zod
        const createValidation = supplierSchema.safeParse(body)
        if (!createValidation.success) {
          const response = NextResponse.json({
            success: false,
            error: 'Validation failed',
            details: createValidation.error.errors.map(err => 
              `${err.path.join('.')}: ${err.message}`
            )
          }, { status: 400 })
          return addSecurityHeaders(response)
        }
        
        const newSupplier = await addSupplier(createValidation.data)
        
        return NextResponse.json({
          success: true,
          message: 'Supplier created successfully',
          data: newSupplier
        })
        
      case 'update':
        // Aktualizuj dostawcę
        const { id, action, ...updates } = body
        
        if (!id) {
          return NextResponse.json({
            error: 'Supplier ID is required'
          }, { status: 400 })
        }
        
        const updatedSupplier = await manager.updateSupplier(id, updates)
        
        return NextResponse.json({
          success: true,
          message: 'Supplier updated successfully',
          data: updatedSupplier
        })
        
      case 'add_product':
        // Dodaj produkt dostawcy
        const { supplierId, productName, productCategory, unitPrice } = body
        
        if (!supplierId || !productName || !productCategory || !unitPrice) {
          return NextResponse.json({
            error: 'Required fields: supplierId, productName, productCategory, unitPrice'
          }, { status: 400 })
        }
        
        const newProduct = await manager.addSupplierProduct({
          supplierId,
          name: productName,
          category: productCategory,
          unitPrice,
          currency: body.currency || 'PLN',
          minimumQuantity: body.minimumQuantity || 1,
          inStock: body.inStock !== false,
          sku: body.sku,
          width: body.width,
          height: body.height,
          thickness: body.thickness,
          bulkPrice: body.bulkPrice,
          bulkMinQuantity: body.bulkMinQuantity,
          leadTime: body.leadTime
        })
        
        return NextResponse.json({
          success: true,
          message: 'Product added successfully',
          data: newProduct
        })
        
      case 'create_order':
        // Utwórz zamówienie do dostawcy
        const { orderSupplierId, items, notes } = body
        
        if (!orderSupplierId || !Array.isArray(items) || items.length === 0) {
          return NextResponse.json({
            error: 'Required fields: orderSupplierId, items (array)'
          }, { status: 400 })
        }
        
        const newOrder = await manager.createSupplierOrder(orderSupplierId, items, notes)
        
        return NextResponse.json({
          success: true,
          message: 'Supplier order created successfully',
          data: newOrder
        })
        
      case 'update_order_status':
        // Aktualizuj status zamówienia
        const { orderId, status, orderNotes } = body
        
        if (!orderId || !status) {
          return NextResponse.json({
            error: 'Required fields: orderId, status'
          }, { status: 400 })
        }
        
        const updatedOrder = await manager.updateOrderStatus(orderId, status, orderNotes)
        
        return NextResponse.json({
          success: true,
          message: 'Order status updated successfully',
          data: updatedOrder
        })
        
      case 'mark_item_received':
        // Oznacz pozycję jako dostarczoną
        const { itemId, receivedQuantity, itemNotes } = body
        
        if (!itemId || receivedQuantity === undefined) {
          return NextResponse.json({
            error: 'Required fields: itemId, receivedQuantity'
          }, { status: 400 })
        }
        
        await manager.markItemAsReceived(itemId, receivedQuantity, itemNotes)
        
        return NextResponse.json({
          success: true,
          message: 'Item marked as received successfully'
        })
        
      default:
        return NextResponse.json({
          error: 'Invalid action parameter'
        }, { status: 400 })
    }
    
  } catch (error) {
    console.error('Error in suppliers POST:', error)
    const response = NextResponse.json({
      success: false,
      error: 'Failed to process supplier request',
      details: sanitizeError(error, process.env.NODE_ENV === 'development')
    }, { status: 500 })
    
    return addSecurityHeaders(response)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Authentication required for delete operations
    const authResult = await requireAuth(request)
    if (authResult instanceof NextResponse) {
      return addSecurityHeaders(authResult)
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const type = searchParams.get('type') || 'supplier'
    
    if (!id) {
      const response = NextResponse.json({
        success: false,
        error: 'ID is required'
      }, { status: 400 })
      return addSecurityHeaders(response)
    }
    
    const { prisma } = await import('@/lib/prisma')
    
    switch (type) {
      case 'supplier':
        // Check if supplier exists
        const existingSupplier = await prisma.supplier.findUnique({
          where: { id },
          include: {
            orders: true,
            products: true
          }
        })
        
        if (!existingSupplier) {
          return NextResponse.json({
            success: false,
            error: 'Supplier not found'
          }, { status: 404 })
        }
        
        // Check for active orders that cannot be auto-deleted
        const criticalOrders = await prisma.supplierOrder.count({
          where: {
            supplierId: id,
            status: { in: ['CONFIRMED', 'IN_TRANSIT', 'PARTIALLY_DELIVERED'] }
          }
        })
        
        if (criticalOrders > 0) {
          return NextResponse.json({
            success: false,
            error: `Cannot delete supplier with ${criticalOrders} critical orders in progress. Complete these orders first.`
          }, { status: 400 })
        }
        
        try {
          // Delete in transaction to ensure consistency - proper cascade order
          await prisma.$transaction(async (tx) => {
            // First: Get all order IDs for this supplier
            const supplierOrders = await tx.supplierOrder.findMany({
              where: { 
                supplierId: id,
                status: { in: ['DRAFT', 'SENT'] }
              },
              select: { id: true }
            })
            
            const orderIds = supplierOrders.map(order => order.id)
            
            // Second: Delete all order items first (they reference products)
            if (orderIds.length > 0) {
              await tx.supplierOrderItem.deleteMany({
                where: {
                  orderId: { in: orderIds }
                }
              })
            }
            
            // Third: Delete the orders (now safe since items are gone)
            if (orderIds.length > 0) {
              await tx.supplierOrder.deleteMany({
                where: {
                  id: { in: orderIds }
                }
              })
            }
            
            // Fourth: Delete all products (now safe since no order items reference them)
            await tx.supplierProduct.deleteMany({
              where: { supplierId: id }
            })
            
            // Finally: Delete the supplier
            await tx.supplier.delete({
              where: { id }
            })
          })
          
          return NextResponse.json({
            success: true,
            message: `Supplier "${existingSupplier.name}" deleted successfully`
          })
        } catch (deleteError: any) {
          console.error('Error deleting supplier:', deleteError)
          console.error('Full error details:', JSON.stringify(deleteError, null, 2))
          return NextResponse.json({
            success: false,
            error: `Failed to delete supplier: ${deleteError.message || deleteError.toString()}`
          }, { status: 500 })
        }
        
      case 'product':
        // Usuń produkt dostawcy
        await prisma.supplierProduct.delete({
          where: { id }
        })
        
        return NextResponse.json({
          success: true,
          message: 'Product deleted successfully'
        })
        
      case 'order':
        // Usuń zamówienie (tylko szkice)
        const order = await prisma.supplierOrder.findUnique({
          where: { id }
        })
        
        if (!order) {
          return NextResponse.json({
            error: 'Order not found'
          }, { status: 404 })
        }
        
        if (order.status !== 'DRAFT') {
          return NextResponse.json({
            error: 'Can only delete draft orders'
          }, { status: 400 })
        }
        
        await prisma.supplierOrder.delete({
          where: { id }
        })
        
        return NextResponse.json({
          success: true,
          message: 'Order deleted successfully'
        })
        
      default:
        return NextResponse.json({
          error: 'Invalid type parameter'
        }, { status: 400 })
    }
    
  } catch (error) {
    console.error('Error in suppliers DELETE:', error)
    const response = NextResponse.json({
      success: false,
      error: 'Failed to delete resource',
      details: sanitizeError(error, process.env.NODE_ENV === 'development')
    }, { status: 500 })
    
    return addSecurityHeaders(response)
  }
}