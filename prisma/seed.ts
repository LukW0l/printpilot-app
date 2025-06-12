import { PrismaClient } from '../src/generated/prisma'
import { getAvailableStretcherBarLengths, getAvailableCrossbarLengths } from '../src/lib/frame-calculator'
import { randomBytes } from 'crypto'

const prisma = new PrismaClient()

function generateId() {
  return randomBytes(12).toString('base64url')
}

async function main() {
  console.log('🌱 Seeding database...')

  // Seed stretcher bar inventory
  console.log('📏 Seeding stretcher bar inventory...')
  
  const thinLengths = getAvailableStretcherBarLengths('THIN')
  const thickLengths = getAvailableStretcherBarLengths('THICK')
  
  for (const length of thinLengths) {
    await prisma.stretcher_bar_inventory.upsert({
      where: {
        length_type: {
          length,
          type: 'THIN'
        }
      },
      update: {},
      create: {
        id: generateId(),
        length,
        type: 'THIN',
        stock: Math.max(20, Math.floor(length / 2)), // Calculated stock based on length
        minStock: Math.max(5, Math.floor(length / 10)), // Min stock based on length
        updatedAt: new Date()
      }
    })
  }
  
  for (const length of thickLengths) {
    await prisma.stretcher_bar_inventory.upsert({
      where: {
        length_type: {
          length,
          type: 'THICK'
        }
      },
      update: {},
      create: {
        id: generateId(),
        length,
        type: 'THICK',
        stock: Math.max(15, Math.floor(length / 3)), // Calculated stock based on length
        minStock: Math.max(3, Math.floor(length / 15)), // Min stock based on length
        updatedAt: new Date()
      }
    })
  }

  // Seed crossbar inventory
  console.log('⚡ Seeding crossbar inventory...')
  
  const crossbarLengths = getAvailableCrossbarLengths()
  
  for (const length of crossbarLengths) {
    await prisma.crossbar_inventory.upsert({
      where: { length },
      update: {},
      create: {
        id: generateId(),
        length,
        stock: Math.max(10, Math.floor(length / 4)), // Calculated stock based on length
        minStock: Math.max(2, Math.floor(length / 20)), // Min stock based on length
        updatedAt: new Date()
      }
    })
  }

  // Note: No test users or shops created in seed
  // Admin users should be created through proper registration
  // Shops should be added through the dashboard interface
  console.log('⚠️ No test users or shops created - use proper registration/setup process')

  // Note: No sample orders created in seed
  // Orders should only come from real WooCommerce synchronization
  console.log('✅ Seed data ready for production - no dummy orders created')
  console.log('💡 Import real orders by connecting to WooCommerce shops and running sync')

  console.log('✅ Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })