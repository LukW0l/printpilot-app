import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'

function generateId() {
  return randomBytes(12).toString('base64url')
}

type SupplierCategory = 'FRAMES' | 'CANVAS' | 'PRINTING' | 'PACKAGING' | 'SHIPPING' | 'OTHER'
type SupplierOrderStatus = 'DRAFT' | 'SENT' | 'CONFIRMED' | 'IN_TRANSIT' | 'PARTIALLY_DELIVERED' | 'DELIVERED' | 'CANCELLED'

interface SupplierData {
  id?: string
  name: string
  contactPerson?: string
  email: string
  phone?: string
  website?: string
  address: string
  city: string
  postalCode: string
  country: string
  category: SupplierCategory
  paymentTerms?: string
  deliveryTime?: number
  minimumOrderValue?: number
  rating: number
  reliability: number
  qualityRating: number
  isActive: boolean
  isPreferred: boolean
  thinStripPricePerMeter?: number
  thickStripPricePerMeter?: number
  crossbarPricePerMeter?: number
  materialMargin?: number
  products?: SupplierProduct[]
}

interface SupplierProduct {
  id?: string
  supplierId: string
  name: string
  sku?: string
  category: string
  width?: number
  height?: number
  thickness?: number
  unitPrice: number
  currency: string
  minimumQuantity: number
  bulkPrice?: number
  bulkMinQuantity?: number
  inStock: boolean
  leadTime?: number
}

interface SupplierOrder {
  id?: string
  supplierId: string
  orderNumber: string
  status: SupplierOrderStatus
  totalAmount: number
  currency: string
  orderDate: Date
  expectedDelivery?: Date
  actualDelivery?: Date
  paymentStatus: string
  paidAt?: Date
  notes?: string
  internalNotes?: string
  items: SupplierOrderItem[]
}

interface SupplierOrderItem {
  id?: string
  orderId: string
  productId: string
  quantity: number
  unitPrice: number
  totalPrice: number
  received: boolean
  receivedQuantity: number
  receivedAt?: Date
}

interface SupplierStats {
  totalSuppliers: number
  activeSuppliers: number
  preferredSuppliers: number
  categoryBreakdown: Record<SupplierCategory, number>
  averageRating: number
  averageReliability: number
  totalOrders: number
  totalOrderValue: number
  onTimeDeliveryRate: number
  topSuppliers: Array<{
    id: string
    name: string
    orderCount: number
    totalValue: number
    averageRating: number
    onTimeRate: number
  }>
}

export class SupplierManager {
  
  // Dodaj nowego dostawcę
  async addSupplier(supplierData: SupplierData): Promise<SupplierData> {
    const supplier = await prisma.suppliers.create({
      data: {
        id: generateId(),
        name: supplierData.name,
        contactPerson: supplierData.contactPerson,
        email: supplierData.email,
        phone: supplierData.phone,
        website: supplierData.website,
        address: supplierData.address,
        city: supplierData.city,
        postalCode: supplierData.postalCode,
        country: supplierData.country,
        category: supplierData.category,
        paymentTerms: supplierData.paymentTerms,
        deliveryTime: supplierData.deliveryTime,
        minimumOrderValue: supplierData.minimumOrderValue,
        rating: supplierData.rating,
        reliability: supplierData.reliability,
        qualityRating: supplierData.qualityRating,
        isActive: supplierData.isActive,
        isPreferred: supplierData.isPreferred,
        thinStripPricePerMeter: supplierData.thinStripPricePerMeter,
        thickStripPricePerMeter: supplierData.thickStripPricePerMeter,
        crossbarPricePerMeter: supplierData.crossbarPricePerMeter,
        materialMargin: supplierData.materialMargin,
        updatedAt: new Date()
      }
    })
    
    console.log(`✅ Added new supplier: ${supplier.name} (${supplier.category})`)
    return this.mapSupplierToData(supplier)
  }
  
  // Aktualizuj dostawcę
  async updateSupplier(id: string, updates: Partial<SupplierData>): Promise<SupplierData> {
    // Usuń pola które nie są w modelu Prisma
    const { products, ...cleanUpdates } = updates
    
    const supplier = await prisma.suppliers.update({
      where: { id },
      data: {
        ...cleanUpdates,
        updatedAt: new Date()
      }
    })
    
    console.log(`📝 Updated supplier: ${supplier.name}`)
    return this.mapSupplierToData(supplier)
  }
  
  // Pobierz dostawców
  async getSuppliers(
    category?: SupplierCategory,
    activeOnly: boolean = true
  ): Promise<SupplierData[]> {
    const where: any = {}
    
    if (activeOnly) {
      where.isActive = true
    }
    
    if (category) {
      where.category = category
    }
    
    const suppliers = await prisma.suppliers.findMany({
      where,
      include: {
        supplier_products: true  // Include all products for frame orders
      },
      orderBy: [
        { isPreferred: 'desc' },
        { rating: 'desc' },
        { name: 'asc' }
      ]
    })
    
    return suppliers.map(s => this.mapSupplierToData(s))
  }
  
  // Pobierz dostawcę po ID
  async getSupplier(id: string): Promise<SupplierData | null> {
    const supplier = await prisma.suppliers.findUnique({
      where: { id },
      include: {
        supplier_products: true,
        supplier_orders: {
          include: {
            supplier_order_items: true
          }
        }
      }
    })
    
    if (!supplier) {
      return null
    }
    
    return this.mapSupplierToData(supplier)
  }
  
  // Dodaj produkt dostawcy
  async addSupplierProduct(productData: SupplierProduct): Promise<SupplierProduct> {
    const product = await prisma.supplier_products.create({
      data: {
        id: generateId(),
        supplierId: productData.supplierId,
        name: productData.name,
        sku: productData.sku,
        category: productData.category,
        width: productData.width,
        height: productData.height,
        thickness: productData.thickness,
        unitPrice: productData.unitPrice,
        currency: productData.currency,
        minimumQuantity: productData.minimumQuantity,
        bulkPrice: productData.bulkPrice,
        bulkMinQuantity: productData.bulkMinQuantity,
        inStock: productData.inStock,
        leadTime: productData.leadTime,
        updatedAt: new Date()
      }
    })
    
    console.log(`📦 Added product: ${product.name} for supplier ${productData.supplierId}`)
    return this.mapProductToData(product)
  }
  
  // Pobierz produkty dostawcy
  async getSupplierProducts(
    supplierId: string,
    category?: string,
    inStockOnly: boolean = false
  ): Promise<SupplierProduct[]> {
    const where: any = { supplierId }
    
    if (category) {
      where.category = category
    }
    
    if (inStockOnly) {
      where.inStock = true
    }
    
    const products = await prisma.supplier_products.findMany({
      where,
      orderBy: { name: 'asc' }
    })
    
    return products.map(p => this.mapProductToData(p))
  }
  
  // Utwórz zamówienie do dostawcy
  async createSupplierOrder(
    supplierId: string,
    items: Array<{
      productId: string
      quantity: number
      unitPrice?: number
    }>,
    notes?: string
  ): Promise<SupplierOrder> {
    // Pobierz produkty i oblicz koszty
    const products = await prisma.supplier_products.findMany({
      where: {
        id: { in: items.map(i => i.productId) }
      }
    })
    
    let totalAmount = 0
    const orderItems: Array<{
      id: string
      productId: string
      quantity: number
      unitPrice: number
      totalPrice: number
      updatedAt: Date
    }> = []
    
    for (const item of items) {
      const product = products.find(p => p.id === item.productId)
      if (!product) {
        throw new Error(`Product ${item.productId} not found`)
      }
      
      const unitPrice = item.unitPrice || Number(product.unitPrice)
      const totalPrice = unitPrice * item.quantity
      
      orderItems.push({
        id: generateId(),
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
        updatedAt: new Date()
      })
      
      totalAmount += totalPrice
    }
    
    // Generuj numer zamówienia
    const orderNumber = `SUP-${Date.now()}-${supplierId.slice(-4).toUpperCase()}`
    
    // Utwórz zamówienie
    const order = await prisma.supplier_orders.create({
      data: {
        id: generateId(),
        supplierId,
        orderNumber,
        status: 'DRAFT',
        totalAmount,
        currency: 'PLN',
        orderDate: new Date(),
        notes,
        updatedAt: new Date(),
        supplier_order_items: {
          create: orderItems
        }
      },
      include: {
        supplier_order_items: true,
        suppliers: true
      }
    })
    
    console.log(`📋 Created supplier order: ${orderNumber} for ${totalAmount} PLN`)
    return this.mapOrderToData(order)
  }
  
  // Aktualizuj status zamówienia
  async updateOrderStatus(
    orderId: string,
    status: SupplierOrderStatus,
    notes?: string
  ): Promise<SupplierOrder> {
    const updateData: any = { status }
    
    if (status === 'DELIVERED') {
      updateData.actualDelivery = new Date()
    }
    
    if (notes) {
      updateData.internalNotes = notes
    }
    
    const order = await prisma.supplier_orders.update({
      where: { id: orderId },
      data: updateData,
      include: {
        supplier_order_items: true,
        suppliers: true
      }
    })
    
    console.log(`📊 Updated order ${order.orderNumber} status to ${status}`)
    return this.mapOrderToData(order)
  }
  
  // Oznacz pozycję jako dostarczoną
  async markItemAsReceived(
    itemId: string,
    receivedQuantity: number,
    notes?: string
  ): Promise<void> {
    await prisma.supplier_order_items.update({
      where: { id: itemId },
      data: {
        received: true,
        receivedQuantity,
        receivedAt: new Date()
      }
    })
    
    // Sprawdź czy całe zamówienie zostało dostarczone
    const item = await prisma.supplier_order_items.findUnique({
      where: { id: itemId },
      include: {
        supplier_orders: {
          include: {
            supplier_order_items: true
          }
        }
      }
    })
    
    if (item) {
      const allReceived = item.supplier_orders.supplier_order_items.every(i => i.received)
      const partiallyReceived = item.supplier_orders.supplier_order_items.some(i => i.received)
      
      if (allReceived) {
        await this.updateOrderStatus(item.orderId, 'DELIVERED')
      } else if (partiallyReceived && item.supplier_orders.status === 'IN_TRANSIT') {
        await this.updateOrderStatus(item.orderId, 'PARTIALLY_DELIVERED')
      }
    }
    
    console.log(`📦 Marked item ${itemId} as received: ${receivedQuantity} units`)
  }
  
  // Pobierz zamówienia dostawcy
  async getSupplierOrders(
    supplierId?: string,
    status?: SupplierOrderStatus,
    days?: number
  ): Promise<SupplierOrder[]> {
    const where: any = {}
    
    if (supplierId) {
      where.supplierId = supplierId
    }
    
    if (status) {
      where.status = status
    }
    
    if (days) {
      const since = new Date()
      since.setDate(since.getDate() - days)
      where.orderDate = { gte: since }
    }
    
    const orders = await prisma.supplier_orders.findMany({
      where,
      include: {
        supplier_order_items: true,
        suppliers: true
      },
      orderBy: { orderDate: 'desc' }
    })
    
    return orders.map(o => this.mapOrderToData(o))
  }
  
  // Statystyki dostawców
  async getSupplierStats(): Promise<SupplierStats> {
    const suppliers = await prisma.suppliers.findMany({
      include: {
        supplier_orders: {
          include: {
            supplier_order_items: true
          }
        }
      }
    })
    
    const stats: SupplierStats = {
      totalSuppliers: suppliers.length,
      activeSuppliers: suppliers.filter(s => s.isActive).length,
      preferredSuppliers: suppliers.filter(s => s.isPreferred).length,
      categoryBreakdown: {
        FRAMES: 0,
        CANVAS: 0,
        PRINTING: 0,
        PACKAGING: 0,
        SHIPPING: 0,
        OTHER: 0
      },
      averageRating: 0,
      averageReliability: 0,
      totalOrders: 0,
      totalOrderValue: 0,
      onTimeDeliveryRate: 0,
      topSuppliers: []
    }
    
    if (suppliers.length === 0) {
      return stats
    }
    
    let totalRating = 0
    let totalReliability = 0
    let onTimeDeliveries = 0
    let totalDeliveries = 0
    
    const supplierPerformance = suppliers.map(supplier => {
      const orderCount = supplier.supplier_orders.length
      const totalValue = supplier.supplier_orders.reduce((sum, order) => sum + Number(order.totalAmount), 0)
      
      // Oblicz punktualność dostaw
      const completedOrders = supplier.supplier_orders.filter(o => o.status === 'DELIVERED' && o.expectedDelivery && o.actualDelivery)
      const onTimeOrders = completedOrders.filter(o => o.actualDelivery! <= o.expectedDelivery!)
      const onTimeRate = completedOrders.length > 0 ? (onTimeOrders.length / completedOrders.length) * 100 : 0
      
      totalRating += supplier.rating
      totalReliability += supplier.reliability
      stats.totalOrders += orderCount
      stats.totalOrderValue += totalValue
      stats.categoryBreakdown[supplier.category as SupplierCategory]++
      
      onTimeDeliveries += onTimeOrders.length
      totalDeliveries += completedOrders.length
      
      return {
        id: supplier.id,
        name: supplier.name,
        orderCount,
        totalValue,
        averageRating: supplier.rating,
        onTimeRate
      }
    })
    
    stats.averageRating = totalRating / suppliers.length
    stats.averageReliability = totalReliability / suppliers.length
    stats.onTimeDeliveryRate = totalDeliveries > 0 ? (onTimeDeliveries / totalDeliveries) * 100 : 0
    
    // Top 5 dostawców według wartości zamówień
    stats.topSuppliers = supplierPerformance
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 5)
    
    return stats
  }
  
  // Znajdź najlepszego dostawcę dla produktu
  async findBestSupplier(
    category: string,
    productSpecs?: {
      width?: number
      height?: number
      thickness?: number
    }
  ): Promise<{
    supplier: SupplierData
    product: SupplierProduct
    score: number
  } | null> {
    const where: any = {
      category,
      inStock: true
    }
    
    if (productSpecs) {
      if (productSpecs.width) where.width = productSpecs.width
      if (productSpecs.height) where.height = productSpecs.height
      if (productSpecs.thickness) where.thickness = productSpecs.thickness
    }
    
    const products = await prisma.supplier_products.findMany({
      where,
      include: {
        suppliers: {
          include: {
            supplier_orders: true
          }
        }
      }
    })
    
    if (products.length === 0) {
      return null
    }
    
    // Oceń dostawców na podstawie:
    // - Ocena ogólna (40%)
    // - Niezawodność (30%)
    // - Cena (20%)
    // - Czas dostawy (10%)
    
    const scored = products.map(product => {
      const supplier = product.suppliers
      const ratingScore = (supplier.rating / 5) * 40
      const reliabilityScore = (supplier.reliability / 5) * 30
      
      // Znajdź najniższą cenę dla porównania
      const minPrice = Math.min(...products.map(p => Number(p.unitPrice)))
      const priceScore = minPrice > 0 ? (minPrice / Number(product.unitPrice)) * 20 : 20
      
      // Czas dostawy (im krócej, tym lepiej)
      const avgDeliveryTime = product.leadTime || supplier.deliveryTime || 7
      const deliveryScore = Math.max(0, (14 - avgDeliveryTime) / 14) * 10
      
      const totalScore = ratingScore + reliabilityScore + priceScore + deliveryScore
      
      return {
        supplier: this.mapSupplierToData(supplier),
        product: this.mapProductToData(product),
        score: totalScore
      }
    })
    
    // Zwróć najlepszego dostawcę
    return scored.sort((a, b) => b.score - a.score)[0]
  }
  
  // Narzędzia pomocnicze
  
  private mapSupplierToData(supplier: any): SupplierData {
    return {
      id: supplier.id,
      name: supplier.name,
      contactPerson: supplier.contactPerson,
      email: supplier.email,
      phone: supplier.phone,
      website: supplier.website,
      address: supplier.address,
      city: supplier.city,
      postalCode: supplier.postalCode,
      country: supplier.country,
      category: supplier.category as SupplierCategory,
      paymentTerms: supplier.paymentTerms,
      deliveryTime: supplier.deliveryTime,
      minimumOrderValue: supplier.minimumOrderValue ? Number(supplier.minimumOrderValue) : undefined,
      rating: supplier.rating,
      reliability: supplier.reliability,
      qualityRating: supplier.qualityRating,
      isActive: supplier.isActive,
      isPreferred: supplier.isPreferred,
      thinStripPricePerMeter: supplier.thinStripPricePerMeter ? Number(supplier.thinStripPricePerMeter) : undefined,
      thickStripPricePerMeter: supplier.thickStripPricePerMeter ? Number(supplier.thickStripPricePerMeter) : undefined,
      crossbarPricePerMeter: supplier.crossbarPricePerMeter ? Number(supplier.crossbarPricePerMeter) : undefined,
      materialMargin: supplier.materialMargin,
      products: supplier.supplier_products ? supplier.supplier_products.map((p: any) => this.mapProductToData(p)) : undefined
    }
  }
  
  private mapProductToData(product: any): SupplierProduct {
    return {
      id: product.id,
      supplierId: product.supplierId,
      name: product.name,
      sku: product.sku,
      category: product.category,
      width: product.width,
      height: product.height,
      thickness: product.thickness,
      unitPrice: Number(product.unitPrice),
      currency: product.currency,
      minimumQuantity: product.minimumQuantity,
      bulkPrice: product.bulkPrice ? Number(product.bulkPrice) : undefined,
      bulkMinQuantity: product.bulkMinQuantity,
      inStock: product.inStock,
      leadTime: product.leadTime
    }
  }
  
  private mapOrderToData(order: any): SupplierOrder {
    return {
      id: order.id,
      supplierId: order.supplierId,
      orderNumber: order.orderNumber,
      status: order.status as SupplierOrderStatus,
      totalAmount: Number(order.totalAmount),
      currency: order.currency,
      orderDate: order.orderDate,
      expectedDelivery: order.expectedDelivery,
      actualDelivery: order.actualDelivery,
      paymentStatus: order.paymentStatus,
      paidAt: order.paidAt,
      notes: order.notes,
      internalNotes: order.internalNotes,
      items: order.items?.map((item: any) => ({
        id: item.id,
        orderId: item.orderId,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
        received: item.received,
        receivedQuantity: item.receivedQuantity,
        receivedAt: item.receivedAt
      })) || []
    }
  }
}

// Funkcje pomocnicze do eksportu

export async function addSupplier(supplierData: SupplierData): Promise<SupplierData> {
  const manager = new SupplierManager()
  return await manager.addSupplier(supplierData)
}

export async function getSuppliers(category?: SupplierCategory, activeOnly: boolean = true): Promise<SupplierData[]> {
  const manager = new SupplierManager()
  return await manager.getSuppliers(category, activeOnly)
}

export async function getSupplierStats(): Promise<SupplierStats> {
  const manager = new SupplierManager()
  return await manager.getSupplierStats()
}

export async function findBestSupplier(category: string, productSpecs?: { width?: number; height?: number; thickness?: number }) {
  const manager = new SupplierManager()
  return await manager.findBestSupplier(category, productSpecs)
}