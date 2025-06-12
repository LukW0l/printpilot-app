import { PrismaClient } from '../src/generated/prisma'
import { randomBytes } from 'crypto'

const prisma = new PrismaClient()

function generateId() {
  return randomBytes(12).toString('base64url')
}

async function seedTempichSupplier() {
  try {
    // Sprawdź czy Tempich już istnieje
    let tempichSupplier = await prisma.suppliers.findFirst({
      where: { name: 'Tempich' }
    })

    if (tempichSupplier) {
      console.log('Dostawca Tempich już istnieje:', tempichSupplier.id)
    } else {

      // Dodaj dostawcę Tempich
      tempichSupplier = await prisma.suppliers.create({
      data: {
        id: generateId(),
        name: 'Tempich',
        contactPerson: 'Zespół Sprzedaży',
        email: 'sprzedaz@tempich.pl',
        phone: '+48 33 812 34 56',
        website: 'https://tempich.pl',
        address: 'ul. Przemysłowa 15',
        city: 'Bielsko-Biała',
        postalCode: '43-300',
        country: 'PL',
        category: 'FRAMES',
        paymentTerms: '14 dni',
        deliveryTime: 3,
        minimumOrderValue: 500.00,
        rating: 4.5,
        reliability: 4.2,
        qualityRating: 4.7,
        isActive: true,
        isPreferred: true,
        updatedAt: new Date()
      }
      })

      console.log('✅ Dodano dostawcę Tempich:', tempichSupplier.id)
    }

    // Sprawdź czy produkty już istnieją
    const existingProducts = await prisma.supplier_products.count({
      where: { supplierId: tempichSupplier.id }
    })

    if (existingProducts > 0) {
      console.log(`✅ Produkty Tempich już istnieją (${existingProducts} szt.)`)
      return
    }

    // Dodaj przykładowe produkty Tempich
    const frameProducts = [
      // Listwy cienkie
      { name: 'Listwa cienka 40cm', width: 40, height: 2, frameType: 'THIN', price: 8.50 },
      { name: 'Listwa cienka 50cm', width: 50, height: 2, frameType: 'THIN', price: 10.50 },
      { name: 'Listwa cienka 60cm', width: 60, height: 2, frameType: 'THIN', price: 12.50 },
      { name: 'Listwa cienka 80cm', width: 80, height: 2, frameType: 'THIN', price: 16.50 },
      { name: 'Listwa cienka 100cm', width: 100, height: 2, frameType: 'THIN', price: 20.50 },
      { name: 'Listwa cienka 120cm', width: 120, height: 2, frameType: 'THIN', price: 24.50 },

      // Listwy grube
      { name: 'Listwa gruba 40cm', width: 40, height: 4, frameType: 'THICK', price: 12.00 },
      { name: 'Listwa gruba 50cm', width: 50, height: 4, frameType: 'THICK', price: 15.00 },
      { name: 'Listwa gruba 60cm', width: 60, height: 4, frameType: 'THICK', price: 18.00 },
      { name: 'Listwa gruba 80cm', width: 80, height: 4, frameType: 'THICK', price: 24.00 },
      { name: 'Listwa gruba 100cm', width: 100, height: 4, frameType: 'THICK', price: 30.00 },
      { name: 'Listwa gruba 120cm', width: 120, height: 4, frameType: 'THICK', price: 36.00 },
      { name: 'Listwa gruba 150cm', width: 150, height: 4, frameType: 'THICK', price: 45.00 }
    ]

    for (const product of frameProducts) {
      await prisma.supplier_products.create({
        data: {
          id: generateId(),
          supplierId: tempichSupplier.id,
          name: product.name,
          sku: `TEMP-${product.frameType}-${product.width}`,
          category: 'FRAME_STRIPS',
          width: product.width,
          height: product.height,
          unitPrice: product.price,
          currency: 'PLN',
          minimumQuantity: 10,
          bulkPrice: product.price * 0.9, // 10% zniżka przy większych zamówieniach
          bulkMinQuantity: 50,
          inStock: true,
          leadTime: 3,
          updatedAt: new Date()
        }
      })
    }

    // Dodaj kompletne zestawy krosien
    const frameKits = [
      { name: 'Zestaw 120x120 z krzyżakiem', width: 120, height: 120, frameType: 'THICK', crossbars: 2, price: 180.00 },
      { name: 'Zestaw 135x100 z krzyżakiem', width: 135, height: 100, frameType: 'THICK', crossbars: 1, price: 155.00 },
      { name: 'Zestaw 100x70 standardowy', width: 100, height: 70, frameType: 'THIN', crossbars: 1, price: 85.00 },
      { name: 'Zestaw 80x60 standardowy', width: 80, height: 60, frameType: 'THIN', crossbars: 1, price: 65.00 }
    ]

    for (const kit of frameKits) {
      await prisma.supplier_products.create({
        data: {
          id: generateId(),
          supplierId: tempichSupplier.id,
          name: kit.name,
          sku: `TEMP-KIT-${kit.width}x${kit.height}-${kit.frameType}`,
          category: 'FRAME_KITS',
          width: kit.width,
          height: kit.height,
          unitPrice: kit.price,
          currency: 'PLN',
          minimumQuantity: 1,
          bulkPrice: kit.price * 0.95, // 5% zniżka przy większych zamówieniach
          bulkMinQuantity: 5,
          inStock: true,
          leadTime: 5,
          updatedAt: new Date()
        }
      })

      // Dodaj też do tabeli frame_kits
      await prisma.frame_kits.create({
        data: {
          id: generateId(),
          name: kit.name,
          width: kit.width,
          height: kit.height,
          frameType: kit.frameType as any,
          crossbars: kit.crossbars,
          description: `Kompletny zestaw krosna ${kit.width}x${kit.height}cm z ${kit.crossbars === 2 ? 'podwójnym krzyżakiem' : 'krzyżakiem'}`,
          updatedAt: new Date()
        }
      })
    }

    console.log('✅ Dodano produkty Tempich')
    console.log('✅ Dodano zestawy krosien do FrameKit')

  } catch (error) {
    console.error('❌ Błąd podczas dodawania Tempich:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Uruchom seed jeśli plik został wywołany bezpośrednio
if (require.main === module) {
  seedTempichSupplier()
}

export default seedTempichSupplier