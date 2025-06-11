import { prisma } from '@/lib/prisma'
import { 
  parseDimensions, 
  calculateStretcherRequirement, 
  getRequiredStretcherBars, 
  getRequiredCrossbars 
} from './frame-calculator'

export interface ProductionCostOptions {
  includeCardboard?: boolean
  includeHook?: boolean
  includeFraming?: boolean
  customMargin?: number
  useExternalPrinting?: boolean // czy używać druku zewnętrznego
}

export interface ProductionCostResult {
  stretcherCost: number
  crossbarCost: number
  canvasCost: number
  printingCost: number
  externalPrintingCost?: number // koszt druku zewnętrznego
  framingCost: number
  cardboardCost: number
  hookCost: number
  totalMaterialCost: number
  wholesalePrice: number
  finalPrice: number
  profit: number
  marginPercentage: number
  printingAnalysis?: {
    internalCost: number // koszt druku własnego
    externalCost: number // koszt druku zewnętrznego
    savings: number // oszczędności przy druku własnym
    breakEvenVolume: number // od jakiej ilości m2 miesięcznie opłaca się druk własny
  }
  breakdown: {
    dimensions: { width: number; height: number }
    areaM2: number
    stretcherBarsUsed: Array<{ length: number; type: string; quantity: number; cost: number }>
    crossbarsUsed: Array<{ length: number; quantity: number; cost: number }>
    cardboardSize?: { width: number; height: number }
  }
}

export async function calculateProductionCost(
  dimensionString: string,
  options: ProductionCostOptions = {}
): Promise<ProductionCostResult | null> {
  console.log('Parsing dimensions:', dimensionString)
  const dimensions = parseDimensions(dimensionString)
  if (!dimensions) {
    console.log('Failed to parse dimensions')
    return null
  }
  console.log('Parsed dimensions:', dimensions)

  console.log('Fetching production cost config...')
  const config = await prisma.productionCostConfig.findFirst({
    where: { isActive: true }
  })
  
  if (!config) {
    console.log('No active production cost configuration found')
    throw new Error('No active production cost configuration found')
  }
  console.log('Found config:', config.id)

  const { width, height } = dimensions
  const areaM2 = (width * height) / 10000 // Convert cm² to m²

  // Calculate stretcher and crossbar requirements
  const stretcherReq = calculateStretcherRequirement(dimensions)
  const requiredStretcherBars = getRequiredStretcherBars(stretcherReq)
  const requiredCrossbars = getRequiredCrossbars(stretcherReq)

  // Calculate stretcher bar costs
  let stretcherCost = 0
  const stretcherBarsUsed = []
  
  for (const bar of requiredStretcherBars) {
    const lengthInMeters = bar.length / 100
    const pricePerMeter = bar.type === 'THIN' 
      ? Number(config.thinStretcherPrice) 
      : Number(config.thickStretcherPrice)
    const cost = lengthInMeters * pricePerMeter * bar.quantity
    
    stretcherCost += cost
    stretcherBarsUsed.push({
      length: bar.length,
      type: bar.type,
      quantity: bar.quantity,
      cost
    })
  }

  // Calculate crossbar costs
  let crossbarCost = 0
  const crossbarsUsed = []
  
  for (const crossbar of requiredCrossbars) {
    const lengthInMeters = crossbar.length / 100
    const cost = lengthInMeters * Number(config.crossbarPrice) * crossbar.quantity
    
    crossbarCost += cost
    crossbarsUsed.push({
      length: crossbar.length,
      quantity: crossbar.quantity,
      cost
    })
  }

  // Calculate canvas and printing costs
  const canvasCost = areaM2 * Number(config.canvasPricePerM2)
  
  // Determine which printing method to use
  const useExternalPrinting = options.useExternalPrinting ?? Number(config.useExternalPrintingDefault || true)
  const printingCost = useExternalPrinting 
    ? areaM2 * Number(config.externalPrintingPricePerM2 || config.printingPricePerM2)
    : areaM2 * Number(config.printingPricePerM2)
  
  const externalPrintingCost = useExternalPrinting ? printingCost : undefined
  
  // Calculate printing analysis
  const internalPrintingCost = areaM2 * Number(config.printingPricePerM2)
  const externalPrintingCostForAnalysis = areaM2 * Number(config.externalPrintingPricePerM2 || config.printingPricePerM2)
  
  // Break-even analysis for own printer
  const printerTotalCost = Number(config.printerPurchaseCost || 15000)
  const monthlyMaintenance = Number(config.printerMonthlyMaintenance || 500)
  const lifespanMonths = Number(config.printerLifespanMonths || 36)
  const monthlyCostOfOwnership = (printerTotalCost / lifespanMonths) + monthlyMaintenance
  const savingsPerM2 = externalPrintingCostForAnalysis - internalPrintingCost
  const breakEvenVolumeM2 = savingsPerM2 > 0 ? monthlyCostOfOwnership / savingsPerM2 : Infinity
  
  const printingAnalysis = {
    internalCost: internalPrintingCost,
    externalCost: externalPrintingCostForAnalysis,
    savings: savingsPerM2,
    breakEvenVolume: breakEvenVolumeM2
  }

  // Calculate optional costs
  const framingCost = options.includeFraming !== false ? Number(config.framingPrice) : 0
  const hookCost = options.includeHook !== false ? Number(config.hookPrice) : 0

  // Calculate cardboard cost
  let cardboardCost = 0
  let cardboardSize: { width: number; height: number } | null | undefined
  
  if (options.includeCardboard !== false) {
    cardboardSize = await findBestCardboardSize(width, height)
    if (cardboardSize) {
      const cardboard = await prisma.cardboardInventory.findUnique({
        where: {
          width_height: {
            width: cardboardSize.width,
            height: cardboardSize.height
          }
        }
      })
      cardboardCost = cardboard ? Number(cardboard.price) : Number(config.cardboardPrice)
    } else {
      cardboardCost = Number(config.cardboardPrice)
    }
  }

  // Calculate totals
  const totalMaterialCost = stretcherCost + crossbarCost + canvasCost + printingCost + 
                           framingCost + cardboardCost + hookCost

  const wholesaleMarkup = Number(config.wholesaleMarkup)
  const wholesalePrice = totalMaterialCost * (1 + wholesaleMarkup / 100)

  const marginPercentage = options.customMargin ?? Number(config.marginPercentage)
  const finalPrice = wholesalePrice * (1 + marginPercentage / 100)
  const profit = finalPrice - totalMaterialCost

  return {
    stretcherCost,
    crossbarCost,
    canvasCost,
    printingCost,
    externalPrintingCost,
    framingCost,
    cardboardCost,
    hookCost,
    totalMaterialCost,
    wholesalePrice,
    finalPrice,
    profit,
    marginPercentage,
    printingAnalysis,
    breakdown: {
      dimensions,
      areaM2,
      stretcherBarsUsed,
      crossbarsUsed,
      cardboardSize: cardboardSize || undefined
    }
  }
}

async function findBestCardboardSize(width: number, height: number): Promise<{ width: number; height: number } | null> {
  const cardboards = await prisma.cardboardInventory.findMany({
    where: {
      width: { gte: width },
      height: { gte: height },
      stock: { gt: 0 }
    },
    orderBy: [
      { width: 'asc' },
      { height: 'asc' }
    ]
  })

  return cardboards.length > 0 ? { width: cardboards[0].width, height: cardboards[0].height } : null
}

export async function saveProductionCostForOrder(
  orderItemId: string,
  costResult: ProductionCostResult,
  options: ProductionCostOptions = {}
): Promise<void> {
  const config = await prisma.productionCostConfig.findFirst({
    where: { isActive: true }
  })

  await prisma.productionCost.upsert({
    where: { orderItemId },
    update: {
      stretcherCost: costResult.stretcherCost,
      crossbarCost: costResult.crossbarCost,
      canvasCost: costResult.canvasCost,
      printingCost: costResult.printingCost,
      framingCost: costResult.framingCost,
      cardboardCost: costResult.cardboardCost,
      hookCost: costResult.hookCost,
      totalMaterialCost: costResult.totalMaterialCost,
      wholesalePrice: costResult.wholesalePrice,
      finalPrice: costResult.finalPrice,
      profit: costResult.profit,
      configId: config?.id,
      includeCardboard: options.includeCardboard !== false,
      includeHook: options.includeHook !== false,
      includeFraming: options.includeFraming !== false
    },
    create: {
      orderItemId,
      stretcherCost: costResult.stretcherCost,
      crossbarCost: costResult.crossbarCost,
      canvasCost: costResult.canvasCost,
      printingCost: costResult.printingCost,
      framingCost: costResult.framingCost,
      cardboardCost: costResult.cardboardCost,
      hookCost: costResult.hookCost,
      totalMaterialCost: costResult.totalMaterialCost,
      wholesalePrice: costResult.wholesalePrice,
      finalPrice: costResult.finalPrice,
      profit: costResult.profit,
      configId: config?.id,
      includeCardboard: options.includeCardboard !== false,
      includeHook: options.includeHook !== false,
      includeFraming: options.includeFraming !== false
    }
  })
}

export async function getProductionCostConfig() {
  let config = await prisma.productionCostConfig.findFirst({
    where: { isActive: true }
  })

  if (!config) {
    // Utwórz domyślną konfigurację jeśli nie istnieje
    config = await prisma.productionCostConfig.create({
      data: {
        thinStretcherPrice: 1.5,
        thickStretcherPrice: 2.0,
        crossbarPrice: 1.2,
        canvasPricePerM2: 25.0,
        printingPricePerM2: 15.0,
        framingPrice: 10.0,
        hookPrice: 1.0,
        cardboardPrice: 1.5,
        wholesaleMarkup: 100.0,
        marginPercentage: 20.0,
        hourlyLaborRate: 50.0,
        estimatedTimePerItem: 0.5,
        packagingCostPerOrder: 5.0,
        processingFeePercentage: 2.0,
        shippingCostPercentage: 80.0,
        isActive: true
      }
    })
  }

  // Upewnij się, że wszystkie pola mają wartości (dla wstecznej kompatybilności)
  return {
    ...config,
    hourlyLaborRate: config.hourlyLaborRate ?? 50.0,
    estimatedTimePerItem: config.estimatedTimePerItem ?? 0.5,
    packagingCostPerOrder: config.packagingCostPerOrder ?? 5.0,
    processingFeePercentage: config.processingFeePercentage ?? 2.0,
    shippingCostPercentage: config.shippingCostPercentage ?? 80.0,
    externalPrintingPricePerM2: config.externalPrintingPricePerM2 ?? 18.0,
    useExternalPrintingDefault: config.useExternalPrintingDefault ?? true,
    printerPurchaseCost: config.printerPurchaseCost ?? 15000.0,
    printerMonthlyMaintenance: config.printerMonthlyMaintenance ?? 500.0,
    printerLifespanMonths: config.printerLifespanMonths ?? 36,
  }
}

export async function updateProductionCostConfig(updates: Partial<{
  thinStretcherPrice: number
  thickStretcherPrice: number
  crossbarPrice: number
  canvasPricePerM2: number
  printingPricePerM2: number
  externalPrintingPricePerM2: number
  useExternalPrintingDefault: boolean
  printerPurchaseCost: number
  printerMonthlyMaintenance: number
  printerLifespanMonths: number
  framingPrice: number
  hookPrice: number
  cardboardPrice: number
  wholesaleMarkup: number
  marginPercentage: number
  hourlyLaborRate: number
  estimatedTimePerItem: number
  packagingCostPerOrder: number
  processingFeePercentage: number
  shippingCostPercentage: number
}>) {
  const config = await prisma.productionCostConfig.findFirst({
    where: { isActive: true }
  })

  if (!config) {
    throw new Error('No active production cost configuration found')
  }

  return await prisma.productionCostConfig.update({
    where: { id: config.id },
    data: {
      ...(updates.thinStretcherPrice !== undefined && { thinStretcherPrice: updates.thinStretcherPrice }),
      ...(updates.thickStretcherPrice !== undefined && { thickStretcherPrice: updates.thickStretcherPrice }),
      ...(updates.crossbarPrice !== undefined && { crossbarPrice: updates.crossbarPrice }),
      ...(updates.canvasPricePerM2 !== undefined && { canvasPricePerM2: updates.canvasPricePerM2 }),
      ...(updates.printingPricePerM2 !== undefined && { printingPricePerM2: updates.printingPricePerM2 }),
      ...(updates.externalPrintingPricePerM2 !== undefined && { externalPrintingPricePerM2: updates.externalPrintingPricePerM2 }),
      ...(updates.useExternalPrintingDefault !== undefined && { useExternalPrintingDefault: updates.useExternalPrintingDefault }),
      ...(updates.printerPurchaseCost !== undefined && { printerPurchaseCost: updates.printerPurchaseCost }),
      ...(updates.printerMonthlyMaintenance !== undefined && { printerMonthlyMaintenance: updates.printerMonthlyMaintenance }),
      ...(updates.printerLifespanMonths !== undefined && { printerLifespanMonths: updates.printerLifespanMonths }),
      ...(updates.framingPrice !== undefined && { framingPrice: updates.framingPrice }),
      ...(updates.hookPrice !== undefined && { hookPrice: updates.hookPrice }),
      ...(updates.cardboardPrice !== undefined && { cardboardPrice: updates.cardboardPrice }),
      ...(updates.wholesaleMarkup !== undefined && { wholesaleMarkup: updates.wholesaleMarkup }),
      ...(updates.marginPercentage !== undefined && { marginPercentage: updates.marginPercentage }),
      ...(updates.hourlyLaborRate !== undefined && { hourlyLaborRate: updates.hourlyLaborRate }),
      ...(updates.estimatedTimePerItem !== undefined && { estimatedTimePerItem: updates.estimatedTimePerItem }),
      ...(updates.packagingCostPerOrder !== undefined && { packagingCostPerOrder: updates.packagingCostPerOrder }),
      ...(updates.processingFeePercentage !== undefined && { processingFeePercentage: updates.processingFeePercentage }),
      ...(updates.shippingCostPercentage !== undefined && { shippingCostPercentage: updates.shippingCostPercentage }),
      updatedAt: new Date()
    }
  })
}