'use client'

import { useState, useEffect, useMemo } from 'react'

interface ProductionCostConfig {
  id: string
  thinStretcherPrice: number
  thickStretcherPrice: number
  crossbarPrice: number
  canvasPricePerM2: number
  printingPricePerM2: number
  framingPrice: number
  hookPrice: number
  cardboardPrice: number
  wholesaleMarkup: number
  marginPercentage: number
  // Dodatkowe parametry dla analizy rentowności
  hourlyLaborRate?: number
  estimatedTimePerItem?: number
  packagingCostPerOrder?: number
  processingFeePercentage?: number
  shippingCostPercentage?: number
}

interface CostResult {
  stretcherCost: number
  crossbarCost: number
  canvasCost: number
  printingCost: number
  framingCost: number
  cardboardCost: number
  hookCost: number
  totalMaterialCost: number
  wholesalePrice: number
  finalPrice: number
  profit: number
  marginPercentage: number
  includeCardboard?: boolean
  includeHook?: boolean
  includeFraming?: boolean
  breakdown?: {
    dimensions: { width: number; height: number }
    areaM2: number
    stretcherBarsUsed: Array<{ length: number; type: string; quantity: number; cost: number }>
    crossbarsUsed: Array<{ length: number; quantity: number; cost: number }>
    cardboardSize?: { width: number; height: number }
  }
}

export default function ProductionCostsPage() {
  const [config, setConfig] = useState<ProductionCostConfig | null>(null)
  const [dimensions, setDimensions] = useState('120x80')
  const [costResult, setCostResult] = useState<CostResult | null>(null)
  const [includeCardboard, setIncludeCardboard] = useState(true)
  const [includeHook, setIncludeHook] = useState(true)
  const [includeFraming, setIncludeFraming] = useState(true)
  const [customMargin, setCustomMargin] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/production-costs/config')
      const data = await response.json()
      setConfig(data)
    } catch (error) {
      console.error('Error fetching config:', error)
    }
  }

  const calculateCost = async () => {
    if (!dimensions) {
      setCostResult(null)
      return
    }
    
    setLoading(true)
    try {
      const requestBody = {
        dimensions,
        options: {
          includeCardboard,
          includeHook,
          includeFraming,
          customMargin
        }
      }
      
      console.log('Sending request:', requestBody)
      
      const response = await fetch('/api/production-costs/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })
      
      const result = await response.json()
      console.log('API Response:', result)
      
      if (!response.ok) {
        console.error('HTTP error response:', result)
        throw new Error(`HTTP error! status: ${response.status}. Error: ${result.error || 'Unknown error'}`)
      }
      
      if (result.error) {
        console.error('API error:', result.error)
        setCostResult(null)
        return
      }
      
      setCostResult(result)
    } catch (error) {
      console.error('Error calculating cost:', error)
      setCostResult(null)
    } finally {
      setLoading(false)
    }
  }

  // Auto-calculate when inputs change (dimensions and options)
  useEffect(() => {
    setIsTyping(true)
    
    const timeoutId = setTimeout(() => {
      setIsTyping(false)
      calculateCost()
    }, 800) // Increased delay to prevent flashing while typing
    
    return () => {
      clearTimeout(timeoutId)
      setIsTyping(false)
    }
  }, [dimensions, includeCardboard, includeHook, includeFraming, customMargin])

  // Calculate price locally when config changes (no API call needed)
  const getUpdatedPrice = useMemo(() => {
    if (!costResult || !config || !costResult.breakdown) return costResult

    // Recalculate material costs based on new config prices
    const { breakdown } = costResult
    const areaM2 = breakdown.areaM2

    // Recalculate individual material costs
    let newStretcherCost = 0
    breakdown.stretcherBarsUsed.forEach(bar => {
      const lengthInMeters = bar.length / 100
      const pricePerMeter = bar.type === 'THIN' 
        ? Number(config.thinStretcherPrice) 
        : Number(config.thickStretcherPrice)
      newStretcherCost += lengthInMeters * pricePerMeter * bar.quantity
    })

    let newCrossbarCost = 0
    breakdown.crossbarsUsed?.forEach(crossbar => {
      const lengthInMeters = crossbar.length / 100
      newCrossbarCost += lengthInMeters * Number(config.crossbarPrice) * crossbar.quantity
    })

    const newCanvasCost = areaM2 * Number(config.canvasPricePerM2)
    const newPrintingCost = areaM2 * Number(config.printingPricePerM2)
    const newFramingCost = costResult.includeFraming !== false ? Number(config.framingPrice) : 0
    const newHookCost = costResult.includeHook !== false ? Number(config.hookPrice) : 0
    const newCardboardCost = costResult.includeCardboard !== false ? Number(config.cardboardPrice) : 0

    const newTotalMaterialCost = newStretcherCost + newCrossbarCost + newCanvasCost + 
                                newPrintingCost + newFramingCost + newHookCost + newCardboardCost

    const wholesalePrice = newTotalMaterialCost * (1 + Number(config.wholesaleMarkup) / 100)
    const marginPercentage = customMargin ?? Number(config.marginPercentage)
    const finalPrice = wholesalePrice * (1 + marginPercentage / 100)
    const profit = finalPrice - newTotalMaterialCost

    return {
      ...costResult,
      stretcherCost: newStretcherCost,
      crossbarCost: newCrossbarCost,
      canvasCost: newCanvasCost,
      printingCost: newPrintingCost,
      framingCost: newFramingCost,
      hookCost: newHookCost,
      cardboardCost: newCardboardCost,
      totalMaterialCost: newTotalMaterialCost,
      wholesalePrice,
      finalPrice,
      profit,
      marginPercentage
    }
  }, [costResult, config, customMargin])

  const updateConfig = async (field: string, value: number) => {
    if (!config) return
    
    // Update config immediately for instant UI feedback
    setConfig(prev => prev ? { ...prev, [field]: value } : null)
    
    try {
      const response = await fetch('/api/production-costs/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      })
      const updatedConfig = await response.json()
      setConfig(updatedConfig)
    } catch (error) {
      console.error('Error updating config:', error)
      // Revert on error
      fetchConfig()
    }
  }

  // Pomocnicza funkcja dla bezpiecznych wartości inputów
  const getConfigValue = (field: keyof ProductionCostConfig, defaultValue: number): number => {
    return (config?.[field] as number) ?? defaultValue
  }

  if (!config) {
    return <div className="p-6">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Kalkulator kosztów produkcji</h1>
          <p className="text-gray-600">Oblicz koszty produkcji i ceny dla niestandardowych ram</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Calculator */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Input Section */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Wymiary</label>
                    <input
                      type="text"
                      value={dimensions}
                      onChange={(e) => setDimensions(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 text-lg font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="120x80"
                    />
                    <p className="text-xs text-gray-500 mt-1">Podaj szerokość × wysokość w cm</p>
                  </div>
                  
                  <div className="space-y-3">
                    <label className="block text-sm font-semibold text-gray-900">Opcje</label>
                    
                    <label className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeCardboard}
                        onChange={(e) => setIncludeCardboard(e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-3 text-sm font-medium text-gray-900">Podłoże kartonowe</span>
                    </label>
                    
                    <label className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeHook}
                        onChange={(e) => setIncludeHook(e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-3 text-sm font-medium text-gray-900">Haczyk do zawieszenia</span>
                    </label>
                    
                    <label className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeFraming}
                        onChange={(e) => setIncludeFraming(e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-3 text-sm font-medium text-gray-900">Profesjonalne ramowanie</span>
                    </label>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Własna marża (%)</label>
                    <input
                      type="number"
                      step="1"
                      value={customMargin || ''}
                      onChange={(e) => setCustomMargin(e.target.value ? parseFloat(e.target.value) : null)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder={`Domyślnie: ${config?.marginPercentage || 20}%`}
                    />
                  </div>
                </div>

                {/* Results Section */}
                <div className="space-y-4">
                  {loading && !isTyping && (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <span className="ml-3 text-sm text-gray-600">Obliczanie...</span>
                    </div>
                  )}
                  
                  {getUpdatedPrice && getUpdatedPrice.totalMaterialCost !== undefined && !loading && (
                    <div className={`bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200 transition-opacity duration-200 ${isTyping ? 'opacity-50' : 'opacity-100'}`}>
                      <h3 className="text-lg font-bold text-gray-900 mb-4">Rozkład kosztów</h3>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-blue-200">
                          <span className="text-sm text-gray-600">Koszt materiałów</span>
                          <span className="font-semibold text-gray-900">{getUpdatedPrice.totalMaterialCost.toFixed(2)} PLN</span>
                        </div>
                        
                        <div className="flex justify-between items-center py-2 border-b border-blue-200">
                          <span className="text-sm text-gray-600">Cena hurtowa</span>
                          <span className="font-semibold text-gray-900">{getUpdatedPrice.wholesalePrice.toFixed(2)} PLN</span>
                        </div>
                        
                        <div className="flex justify-between items-center py-3 bg-white rounded-lg px-4 border-2 border-blue-300">
                          <span className="text-lg font-bold text-gray-900">Cena końcowa</span>
                          <span className="text-2xl font-bold text-blue-700">{getUpdatedPrice.finalPrice.toFixed(2)} PLN</span>
                        </div>
                        
                        <div className="flex justify-between items-center py-2 bg-green-50 rounded-lg px-4">
                          <span className="text-sm font-semibold text-green-800">Twój zysk</span>
                          <span className="text-lg font-bold text-green-700">{getUpdatedPrice.profit.toFixed(2)} PLN</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Settings Panel */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Ustawienia cen</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Cienka listwa (PLN/m)</label>
                <input
                  type="number"
                  step="0.1"
                  value={getConfigValue('thinStretcherPrice', 1.5)}
                  onChange={(e) => updateConfig('thinStretcherPrice', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Gruba listwa (PLN/m)</label>
                <input
                  type="number"
                  step="0.1"
                  value={getConfigValue('thickStretcherPrice', 2.0)}
                  onChange={(e) => updateConfig('thickStretcherPrice', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Płótno (PLN/m²)</label>
                <input
                  type="number"
                  step="0.1"
                  value={getConfigValue('canvasPricePerM2', 25.0)}
                  onChange={(e) => updateConfig('canvasPricePerM2', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Druk (PLN/m²)</label>
                <input
                  type="number"
                  step="0.1"
                  value={getConfigValue('printingPricePerM2', 15.0)}
                  onChange={(e) => updateConfig('printingPricePerM2', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Ramowanie (PLN)</label>
                <input
                  type="number"
                  step="0.1"
                  value={getConfigValue('framingPrice', 10.0)}
                  onChange={(e) => updateConfig('framingPrice', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Haczyk (PLN)</label>
                <input
                  type="number"
                  step="0.1"
                  value={getConfigValue('hookPrice', 1.0)}
                  onChange={(e) => updateConfig('hookPrice', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Narzut hurtowy (%)</label>
                <input
                  type="number"
                  step="1"
                  value={getConfigValue('wholesaleMarkup', 100.0)}
                  onChange={(e) => updateConfig('wholesaleMarkup', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Domyślna marża (%)</label>
                <input
                  type="number"
                  step="1"
                  value={getConfigValue('marginPercentage', 20.0)}
                  onChange={(e) => updateConfig('marginPercentage', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            {/* Profitability Analysis Settings */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-md font-bold text-gray-900 mb-4">Analiza rentowności</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Stawka godzinowa (PLN/h)</label>
                  <input
                    type="number"
                    step="1"
                    value={getConfigValue('hourlyLaborRate', 50)}
                    onChange={(e) => updateConfig('hourlyLaborRate', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="50"
                  />
                  <p className="text-xs text-gray-500 mt-1">Koszt pracy na godzinę</p>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Czas na element (h)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={getConfigValue('estimatedTimePerItem', 0.5)}
                    onChange={(e) => updateConfig('estimatedTimePerItem', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.5"
                  />
                  <p className="text-xs text-gray-500 mt-1">Szacowany czas produkcji na jeden element</p>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Koszt opakowania (PLN)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={getConfigValue('packagingCostPerOrder', 5)}
                    onChange={(e) => updateConfig('packagingCostPerOrder', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="5"
                  />
                  <p className="text-xs text-gray-500 mt-1">Koszt opakowania na zamówienie</p>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Prowizje płatnicze (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={getConfigValue('processingFeePercentage', 2)}
                    onChange={(e) => updateConfig('processingFeePercentage', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="2"
                  />
                  <p className="text-xs text-gray-500 mt-1">% od wartości zamówienia</p>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Koszt wysyłki dla nas (%)</label>
                  <input
                    type="number"
                    step="1"
                    value={getConfigValue('shippingCostPercentage', 80)}
                    onChange={(e) => updateConfig('shippingCostPercentage', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="80"
                  />
                  <p className="text-xs text-gray-500 mt-1">% ceny wysyłki płaconej przez klienta</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}