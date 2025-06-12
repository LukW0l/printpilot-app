export interface CanvasDimensions {
  width: number
  height: number
}

export interface StretcherRequirement {
  stretcherType: 'THIN' | 'THICK'
  widthBars: number
  heightBars: number
  crossbars: number
  crossbarLength?: number
  width: number
  height: number
}

export interface StretcherBarStock {
  length: number
  type: 'THIN' | 'THICK'
  stock: number
}

export interface CrossbarStock {
  length: number
  stock: number
}

export function parseDimensions(dimensionString: string): CanvasDimensions | null {
  // Support formats: "120x80", "120 x 80", "120×80", "120cm x 80cm"
  const cleanDim = dimensionString.replace(/cm|px/g, '').trim()
  const match = cleanDim.match(/(\d+)\s*[x×]\s*(\d+)/)
  
  if (!match) return null
  
  return {
    width: parseInt(match[1]),
    height: parseInt(match[2])
  }
}

export function calculateStretcherRequirement(dimensions: CanvasDimensions, frameType?: string): StretcherRequirement {
  const { width, height } = dimensions
  const maxDimension = Math.max(width, height)
  
  // Determine stretcher type based on frameType parameter or auto-detect
  let stretcherType: 'THIN' | 'THICK'
  if (frameType === 'thin') {
    stretcherType = 'THIN'
  } else if (frameType === 'thick') {
    stretcherType = 'THICK'
  } else {
    // Auto mode or default: if any dimension > 90cm, use THICK
    stretcherType = maxDimension > 90 ? 'THICK' : 'THIN'
  }
  
  // Basic frame needs 2 bars of each dimension
  let widthBars = 2
  let heightBars = 2
  let crossbars = 0
  let crossbarLength: number | undefined
  
  // Check if we need crossbars (for dimensions > 120cm)
  const needsCrossbars = width > 120 || height > 120
  
  if (needsCrossbars) {
    // For dimensions > 120cm, add crossbar of the smaller dimension
    crossbars = 1
    crossbarLength = Math.min(width, height)
    
    // Special case: krzyzaki for square formats like 120x120
    if (width === height && width >= 120) {
      // Use 4 bars of the same length + 2 crossbars
      widthBars = 4
      heightBars = 0 // same as width
      crossbars = 2
      crossbarLength = width
    }
  }
  
  return {
    stretcherType,
    widthBars,
    heightBars,
    crossbars,
    crossbarLength,
    width,
    height
  }
}

export function getRequiredStretcherBars(stretcherReq: StretcherRequirement): Array<{length: number, type: 'THIN' | 'THICK', quantity: number}> {
  const result: Array<{length: number, type: 'THIN' | 'THICK', quantity: number}> = []
  
  // Width bars
  if (stretcherReq.widthBars > 0) {
    result.push({
      length: stretcherReq.width,
      type: stretcherReq.stretcherType,
      quantity: stretcherReq.widthBars
    })
  }
  
  // Height bars (only if different from width or if heightBars > 0)
  if (stretcherReq.heightBars > 0) {
    result.push({
      length: stretcherReq.height,
      type: stretcherReq.stretcherType,
      quantity: stretcherReq.heightBars
    })
  }
  
  return result
}

export function getRequiredCrossbars(stretcherReq: StretcherRequirement): Array<{length: number, quantity: number}> {
  if (stretcherReq.crossbars === 0 || !stretcherReq.crossbarLength) return []
  
  return [{
    length: stretcherReq.crossbarLength,
    quantity: stretcherReq.crossbars
  }]
}

export function getAvailableStretcherBarLengths(type: 'THIN' | 'THICK'): number[] {
  if (type === 'THIN') {
    // 30 to 90 cm in 5cm increments
    return Array.from({ length: 13 }, (_, i) => 30 + i * 5) // [30, 35, 40, ..., 90]
  } else {
    // 30 to 160 cm in 5cm increments  
    return Array.from({ length: 27 }, (_, i) => 30 + i * 5) // [30, 35, 40, ..., 160]
  }
}

export function getAvailableCrossbarLengths(): number[] {
  // Same as thick stretcher bars for now
  return Array.from({ length: 27 }, (_, i) => 30 + i * 5) // [30, 35, 40, ..., 160]
}

export function findNearestAvailableLength(requiredLength: number, availableLengths: number[]): number | null {
  // Find the smallest available length that is >= required length
  const suitable = availableLengths.filter(length => length >= requiredLength)
  return suitable.length > 0 ? Math.min(...suitable) : null
}

export function validateStretcherRequirement(stretcherReq: StretcherRequirement): string[] {
  const errors: string[] = []
  
  // Check if required lengths are available
  const stretcherLengths = getAvailableStretcherBarLengths(stretcherReq.stretcherType)
  
  if (stretcherReq.widthBars > 0 && !stretcherLengths.includes(stretcherReq.width)) {
    const nearest = findNearestAvailableLength(stretcherReq.width, stretcherLengths)
    if (!nearest) {
      errors.push(`Width ${stretcherReq.width}cm exceeds maximum available ${stretcherReq.stretcherType.toLowerCase()} stretcher bar length`)
    } else if (nearest !== stretcherReq.width) {
      errors.push(`Width ${stretcherReq.width}cm not available, nearest is ${nearest}cm`)
    }
  }
  
  if (stretcherReq.heightBars > 0 && !stretcherLengths.includes(stretcherReq.height)) {
    const nearest = findNearestAvailableLength(stretcherReq.height, stretcherLengths)
    if (!nearest) {
      errors.push(`Height ${stretcherReq.height}cm exceeds maximum available ${stretcherReq.stretcherType.toLowerCase()} stretcher bar length`)
    } else if (nearest !== stretcherReq.height) {
      errors.push(`Height ${stretcherReq.height}cm not available, nearest is ${nearest}cm`)
    }
  }
  
  if (stretcherReq.crossbars > 0 && stretcherReq.crossbarLength) {
    const crossbarLengths = getAvailableCrossbarLengths()
    if (!crossbarLengths.includes(stretcherReq.crossbarLength)) {
      const nearest = findNearestAvailableLength(stretcherReq.crossbarLength, crossbarLengths)
      if (!nearest) {
        errors.push(`Crossbar length ${stretcherReq.crossbarLength}cm exceeds maximum available length`)
      } else if (nearest !== stretcherReq.crossbarLength) {
        errors.push(`Crossbar length ${stretcherReq.crossbarLength}cm not available, nearest is ${nearest}cm`)
      }
    }
  }
  
  return errors
}

export function checkStockAvailability(
  stretcherReq: StretcherRequirement,
  quantity: number,
  stretcherStock: StretcherBarStock[],
  crossbarStock: CrossbarStock[]
): { available: boolean; missing: Array<{type: string, length: number, required: number, available: number}> } {
  const missing: Array<{type: string, length: number, required: number, available: number}> = []
  
  // Check stretcher bar stock
  const requiredBars = getRequiredStretcherBars(stretcherReq)
  for (const bar of requiredBars) {
    const totalRequired = bar.quantity * quantity
    const stock = stretcherStock.find(s => s.length === bar.length && s.type === bar.type)
    const availableStock = stock?.stock || 0
    
    if (availableStock < totalRequired) {
      missing.push({
        type: `${bar.type} stretcher bar`,
        length: bar.length,
        required: totalRequired,
        available: availableStock
      })
    }
  }
  
  // Check crossbar stock
  const requiredCrossbars = getRequiredCrossbars(stretcherReq)
  for (const crossbar of requiredCrossbars) {
    const totalRequired = crossbar.quantity * quantity
    const stock = crossbarStock.find(s => s.length === crossbar.length)
    const availableStock = stock?.stock || 0
    
    if (availableStock < totalRequired) {
      missing.push({
        type: 'crossbar',
        length: crossbar.length,
        required: totalRequired,
        available: availableStock
      })
    }
  }
  
  return {
    available: missing.length === 0,
    missing
  }
}