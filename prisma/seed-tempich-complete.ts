import { PrismaClient } from '../src/generated/prisma'
import { randomBytes } from 'crypto'

const prisma = new PrismaClient()

function generateId() {
  return randomBytes(12).toString('base64url')
}

async function addAllFrameProducts() {
  try {
    // Znajdź dostawcę Tempich
    const tempichSupplier = await prisma.suppliers.findFirst({
      where: { name: 'Tempich' }
    })

    if (!tempichSupplier) {
      console.log('Dostawca Tempich nie istnieje')
      return
    }

    console.log('Dodaję wszystkie produkty do Tempich...')

    // Pobierz wszystkie rozmiary z inwentarza
    const thinBars = await prisma.stretcher_bar_inventory.findMany({
      where: { type: 'THIN' },
      orderBy: { length: 'asc' }
    })

    const thickBars = await prisma.stretcher_bar_inventory.findMany({
      where: { type: 'THICK' },
      orderBy: { length: 'asc' }
    })

    const crossbars = await prisma.crossbar_inventory.findMany({
      orderBy: { length: 'asc' }
    })

    // Usuń istniejące produkty aby uniknąć duplikatów
    // await prisma.supplier_products.deleteMany({
    //   where: { supplierId: tempichSupplier.id }
    // })

    // Dodaj listwy cienkie
    for (const bar of thinBars) {
      const price = Math.round((bar.length * 0.21 + 4) * 100) / 100 // Formula: długość * 0.21 + 4 PLN
      
      await prisma.supplier_products.create({
        data: {
          id: generateId(),
          supplierId: tempichSupplier.id,
          name: `Listwa cienka ${bar.length}cm`,
          sku: `TEMP-THIN-${bar.length}`,
          category: 'FRAME_STRIPS',
          width: bar.length,
          height: 2,
          unitPrice: price,
          currency: 'PLN',
          minimumQuantity: 10,
          bulkPrice: price * 0.9,
          bulkMinQuantity: 50,
          inStock: true,
          leadTime: 3,
          updatedAt: new Date()
        }
      })
    }

    // Dodaj listwy grube
    for (const bar of thickBars) {
      const price = Math.round((bar.length * 0.30 + 6) * 100) / 100 // Formula: długość * 0.30 + 6 PLN
      
      await prisma.supplier_products.create({
        data: {
          id: generateId(),
          supplierId: tempichSupplier.id,
          name: `Listwa gruba ${bar.length}cm`,
          sku: `TEMP-THICK-${bar.length}`,
          category: 'FRAME_STRIPS',
          width: bar.length,
          height: 4,
          unitPrice: price,
          currency: 'PLN',
          minimumQuantity: 10,
          bulkPrice: price * 0.9,
          bulkMinQuantity: 50,
          inStock: true,
          leadTime: 3,
          updatedAt: new Date()
        }
      })
    }

    // Dodaj poprzeczki
    for (const crossbar of crossbars) {
      const price = Math.round((crossbar.length * 0.18 + 3) * 100) / 100 // Formula: długość * 0.18 + 3 PLN
      
      await prisma.supplier_products.create({
        data: {
          id: generateId(),
          supplierId: tempichSupplier.id,
          name: `Poprzeczka ${crossbar.length}cm`,
          sku: `TEMP-CROSS-${crossbar.length}`,
          category: 'CROSSBARS',
          width: crossbar.length,
          height: 2,
          unitPrice: price,
          currency: 'PLN',
          minimumQuantity: 5,
          bulkPrice: price * 0.85,
          bulkMinQuantity: 25,
          inStock: true,
          leadTime: 3,
          updatedAt: new Date()
        }
      })
    }

    // Dodaj kompletne zestawy (tylko popularne rozmiary)
    const frameKits = [
      { name: 'Zestaw 120x120 z krzyżakiem', width: 120, height: 120, frameType: 'THICK', crossbars: 2, price: 180.00 },
      { name: 'Zestaw 135x100 z krzyżakiem', width: 135, height: 100, frameType: 'THICK', crossbars: 1, price: 155.00 },
      { name: 'Zestaw 100x70 standardowy', width: 100, height: 70, frameType: 'THIN', crossbars: 1, price: 85.00 },
      { name: 'Zestaw 80x60 standardowy', width: 80, height: 60, frameType: 'THIN', crossbars: 1, price: 65.00 },
      { name: 'Zestaw 150x100 z krzyżakiem', width: 150, height: 100, frameType: 'THICK', crossbars: 1, price: 190.00 },
      { name: 'Zestaw 90x60 standardowy', width: 90, height: 60, frameType: 'THIN', crossbars: 1, price: 72.00 }
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
          bulkPrice: kit.price * 0.95,
          bulkMinQuantity: 5,
          inStock: true,
          leadTime: 5,
          updatedAt: new Date()
        }
      })
    }

    // Dodaj produkt "Na wymiar" - pozwala zamówić dowolny rozmiar
    await prisma.supplier_products.create({
      data: {
        id: generateId(),
        supplierId: tempichSupplier.id,
        name: 'Listwa na wymiar (cienka)',
        sku: 'TEMP-THIN-CUSTOM',
        category: 'FRAME_STRIPS_CUSTOM',
        unitPrice: 0.25, // 25 groszy za cm
        currency: 'PLN',
        minimumQuantity: 1,
        bulkPrice: 0.22,
        bulkMinQuantity: 100,
        inStock: true,
        leadTime: 5,
        updatedAt: new Date()
      }
    })

    await prisma.supplier_products.create({
      data: {
        id: generateId(),
        supplierId: tempichSupplier.id,
        name: 'Listwa na wymiar (gruba)',
        sku: 'TEMP-THICK-CUSTOM',
        category: 'FRAME_STRIPS_CUSTOM',
        unitPrice: 0.35, // 35 groszy za cm
        currency: 'PLN',
        minimumQuantity: 1,
        bulkPrice: 0.32,
        bulkMinQuantity: 100,
        inStock: true,
        leadTime: 5,
        updatedAt: new Date()
      }
    })

    await prisma.supplier_products.create({
      data: {
        id: generateId(),
        supplierId: tempichSupplier.id,
        name: 'Zestaw krosna na wymiar',
        sku: 'TEMP-KIT-CUSTOM',
        category: 'FRAME_KITS_CUSTOM',
        unitPrice: 1.50, // 1.50 PLN za cm obwodu
        currency: 'PLN',
        minimumQuantity: 1,
        bulkPrice: 1.35,
        bulkMinQuantity: 10,
        inStock: true,
        leadTime: 7,
        updatedAt: new Date()
      }
    })

    console.log('✅ Dodano wszystkie produkty Tempich z inwentarza')
    console.log(`- Listwy cienkie: ${thinBars.length}`)
    console.log(`- Listwy grube: ${thickBars.length}`)  
    console.log(`- Poprzeczki: ${crossbars.length}`)
    console.log(`- Zestawy gotowe: ${frameKits.length}`)
    console.log('- Produkty na wymiar: 3')

  } catch (error) {
    console.error('❌ Błąd podczas dodawania produktów:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Uruchom jeśli plik został wywołany bezpośrednio
if (require.main === module) {
  addAllFrameProducts()
}

export default addAllFrameProducts