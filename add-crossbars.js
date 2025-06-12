const { PrismaClient } = require('./src/generated/prisma')
const { randomBytes } = require('crypto')

const prisma = new PrismaClient()

function generateId() {
  return randomBytes(12).toString('base64url')
}

async function addCrossbars() {
  try {
    // Find Tempich supplier
    const tempich = await prisma.suppliers.findFirst({
      where: { 
        name: { contains: 'Tempich' },
        isActive: true 
      }
    })

    if (!tempich) {
      console.error('❌ Tempich supplier not found')
      return
    }

    console.log('✅ Found Tempich supplier:', tempich.id)
    
    // Debug: Show current products
    const currentProducts = await prisma.supplier_products.findMany({
      where: { supplierId: tempich.id },
      select: { name: true, category: true }
    })
    console.log('Current products:', currentProducts.map(p => `${p.category}: ${p.name}`).join(', '))

    // Check if crossbars already exist
    const existingCrossbars = await prisma.supplier_products.count({
      where: {
        supplierId: tempich.id,
        category: 'CROSSBARS'
      }
    })

    if (existingCrossbars > 0) {
      console.log(`✅ Crossbars already exist (${existingCrossbars} products)`)
      
      // Show what crossbars exist
      const existingCrossbarList = await prisma.supplier_products.findMany({
        where: {
          supplierId: tempich.id,
          category: 'CROSSBARS'
        },
        select: { name: true, sku: true, width: true }
      })
      console.log('Existing crossbars:', existingCrossbarList.map(p => `${p.name} (${p.sku})`).join(', '))
      
      // Show complete analysis
      console.log('\n🔍 Analysis of what should be visible in frame-orders page:')
      
      const allProducts = await prisma.supplier_products.findMany({
        where: { supplierId: tempich.id },
        select: { name: true, sku: true, category: true }
      })
      
      // Apply the same filtering logic as the frontend
      const visibleProducts = allProducts.filter(product => {
        // Hide custom frame products (created for specific orders)
        if (product.sku && product.sku.startsWith('FRAME-') && product.sku.includes('x')) {
          // Check if it's a standard size by looking for THIN/THICK suffix
          const hasStandardSuffix = product.sku.endsWith('-THIN') || product.sku.endsWith('-THICK')
          if (!hasStandardSuffix) {
            return false // Hide custom frames without standard suffix
          }
        }
        
        return true // Show all other products including standard frames
      })
      
      console.log(`Total products: ${allProducts.length}`)
      console.log(`Visible products after filtering: ${visibleProducts.length}`)
      
      const visibleByCategory = visibleProducts.reduce((acc, product) => {
        if (!acc[product.category]) acc[product.category] = []
        acc[product.category].push(product)
        return acc
      }, {})
      
      Object.entries(visibleByCategory).forEach(([category, products]) => {
        console.log(`\n${category} (${products.length} products):`)
        products.forEach(product => {
          console.log(`  - ${product.name} (${product.sku})`)
        })
      })
      
      return
    }

    // Define crossbar products
    const crossbars = [
      { name: 'Poprzeczka 30cm', width: 30, price: 6.50 },
      { name: 'Poprzeczka 40cm', width: 40, price: 8.50 },
      { name: 'Poprzeczka 50cm', width: 50, price: 10.50 },
      { name: 'Poprzeczka 60cm', width: 60, price: 12.50 },
      { name: 'Poprzeczka 70cm', width: 70, price: 14.50 },
      { name: 'Poprzeczka 80cm', width: 80, price: 16.50 },
      { name: 'Poprzeczka 90cm', width: 90, price: 18.50 },
      { name: 'Poprzeczka 100cm', width: 100, price: 20.50 },
      { name: 'Poprzeczka 110cm', width: 110, price: 22.50 },
      { name: 'Poprzeczka 120cm', width: 120, price: 24.50 }
    ]

    console.log('Creating crossbar products...')

    for (const crossbar of crossbars) {
      await prisma.supplier_products.create({
        data: {
          id: generateId(),
          supplierId: tempich.id,
          name: crossbar.name,
          sku: `TEMP-CROSS-${crossbar.width}`,
          category: 'CROSSBARS',
          width: crossbar.width,
          height: 2, // Standard crossbar height
          unitPrice: crossbar.price,
          currency: 'PLN',
          minimumQuantity: 5,
          bulkPrice: crossbar.price * 0.9, // 10% discount for bulk
          bulkMinQuantity: 20,
          inStock: true,
          leadTime: 3,
          updatedAt: new Date()
        }
      })
      console.log(`  ✅ Added: ${crossbar.name}`)
    }

    console.log('✅ Successfully added all crossbars!')

    // Show summary
    const totalProducts = await prisma.supplier_products.count({
      where: { supplierId: tempich.id }
    })

    const productsByCategory = await prisma.supplier_products.groupBy({
      by: ['category'],
      where: { supplierId: tempich.id },
      _count: { category: true }
    })

    console.log('\n📊 Current Tempich products:')
    productsByCategory.forEach(group => {
      console.log(`  ${group.category}: ${group._count.category} products`)
    })
    console.log(`  Total: ${totalProducts} products`)

  } catch (error) {
    console.error('❌ Error adding crossbars:', error)
  } finally {
    await prisma.$disconnect()
  }
}

addCrossbars()