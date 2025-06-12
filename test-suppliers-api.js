const { PrismaClient } = require('./src/generated/prisma')

// Import directly from the compiled file or recreate the function
async function getSuppliers(category, activeOnly = true) {
  const prisma = new PrismaClient()
  
  const where = {}
  
  if (activeOnly) {
    where.isActive = true
  }
  
  if (category) {
    where.category = category
  }
  
  const suppliers = await prisma.suppliers.findMany({
    where,
    include: {
      supplier_products: true
    },
    orderBy: [
      { isPreferred: 'desc' },
      { rating: 'desc' },
      { name: 'asc' }
    ]
  })
  
  return suppliers.map(s => ({
    id: s.id,
    name: s.name,
    city: s.city,
    category: s.category,
    deliveryTime: s.deliveryTime,
    minimumOrderValue: s.minimumOrderValue ? Number(s.minimumOrderValue) : undefined,
    isActive: s.isActive,
    products: s.supplier_products ? s.supplier_products.map(p => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      category: p.category,
      width: p.width,
      height: p.height,
      unitPrice: Number(p.unitPrice),
      currency: p.currency,
      minimumQuantity: p.minimumQuantity,
      bulkPrice: p.bulkPrice ? Number(p.bulkPrice) : undefined,
      bulkMinQuantity: p.bulkMinQuantity,
      inStock: p.inStock,
      leadTime: p.leadTime
    })) : []
  }))
}

const prisma = new PrismaClient()

async function testSuppliersAPI() {
  try {
    console.log('🧪 Testing suppliers API...')
    
    // Test the function that the API uses
    const suppliers = await getSuppliers('FRAMES', true)
    
    console.log(`Found ${suppliers.length} frame suppliers`)
    
    suppliers.forEach(supplier => {
      console.log(`\n📦 Supplier: ${supplier.name}`)
      console.log(`   Products: ${supplier.products?.length || 0}`)
      
      if (supplier.products && supplier.products.length > 0) {
        const productsByCategory = supplier.products.reduce((acc, product) => {
          if (!acc[product.category]) acc[product.category] = []
          acc[product.category].push(product)
          return acc
        }, {})
        
        Object.entries(productsByCategory).forEach(([category, products]) => {
          console.log(`   ${category}: ${products.length} products`)
          
          // Show a few examples
          products.slice(0, 3).forEach(product => {
            console.log(`     - ${product.name} (${product.sku})`)
          })
          if (products.length > 3) {
            console.log(`     ... and ${products.length - 3} more`)
          }
        })
      }
    })
    
  } catch (error) {
    console.error('❌ Error testing suppliers API:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testSuppliersAPI()