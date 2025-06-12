import { PrismaClient } from '../src/generated/prisma'
import { randomBytes } from 'crypto'

const prisma = new PrismaClient()

function generateId() {
  return randomBytes(12).toString('base64url')
}

async function seedCardboard() {
  console.log('Seeding cardboard inventory...')

  const cardboardSizes = [
    { width: 45, height: 30 },
    { width: 60, height: 40 },
    { width: 75, height: 50 },
    { width: 90, height: 60 },
    { width: 120, height: 80 },
    { width: 140, height: 95 },
    { width: 150, height: 100 }
  ]

  for (const size of cardboardSizes) {
    await prisma.cardboard_inventory.upsert({
      where: {
        width_height: {
          width: size.width,
          height: size.height
        }
      },
      update: {
        stock: 30,
        price: 1.0
      },
      create: {
        id: generateId(),
        width: size.width,
        height: size.height,
        stock: 30,
        minStock: 10,
        price: 1.0,
        updatedAt: new Date()
      }
    })
    console.log(`Created/updated cardboard ${size.width}x${size.height}cm`)
  }

  // Create default production cost configuration
  await prisma.production_cost_config.upsert({
    where: { id: 'default' },
    update: {
      thinStretcherPrice: 1.0,
      thickStretcherPrice: 1.5,
      crossbarPrice: 1.0,
      canvasPricePerM2: 25.0,
      printingPricePerM2: 15.0,
      framingPrice: 10.0,
      hookPrice: 1.0,
      cardboardPrice: 1.0,
      wholesaleMarkup: 100.0,
      marginPercentage: 20.0,
      isActive: true
    },
    create: {
      id: 'default',
      thinStretcherPrice: 1.0,
      thickStretcherPrice: 1.5,
      crossbarPrice: 1.0,
      canvasPricePerM2: 25.0,
      printingPricePerM2: 15.0,
      framingPrice: 10.0,
      hookPrice: 1.0,
      cardboardPrice: 1.0,
      wholesaleMarkup: 100.0,
      marginPercentage: 20.0,
      isActive: true,
      updatedAt: new Date()
    }
  })

  console.log('Default production cost configuration created/updated')
}

seedCardboard()
  .catch(console.error)
  .finally(() => prisma.$disconnect())