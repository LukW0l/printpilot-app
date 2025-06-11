'use client'

import { useState, useEffect } from 'react'
import { formStyles } from '@/styles/form-styles'
import toast from 'react-hot-toast'
import { 
  PrinterIcon,
  CalculatorIcon,
  ChartBarIcon,
  DocumentTextIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline'

interface PrintingAnalysis {
  currentMonthlyVolume: number
  internalCostPerM2: number
  externalCostPerM2: number
  savingsPerM2: number
  breakEvenVolumeM2: number
  printerCosts: {
    purchaseCost: number
    monthlyMaintenance: number
    lifespanMonths: number
    monthlyCostOfOwnership: number
  }
  scenarios: Array<{
    volumeM2: number
    internalTotalCost: number
    externalTotalCost: number
    monthlySavings: number
    paybackMonths: number
  }>
}

interface ProductionCostConfig {
  printingPricePerM2: number
  externalPrintingPricePerM2: number
  useExternalPrintingDefault: boolean
  printerPurchaseCost: number
  printerMonthlyMaintenance: number
  printerLifespanMonths: number
}

export default function PrintingAnalysisPage() {
  const [config, setConfig] = useState<ProductionCostConfig | null>(null)
  const [analysis, setAnalysis] = useState<PrintingAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentVolume, setCurrentVolume] = useState(20) // m2 miesięcznie

  useEffect(() => {
    fetchConfig()
  }, [])

  useEffect(() => {
    if (config) {
      calculateAnalysis()
    }
  }, [config, currentVolume])

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/production-costs/config')
      const data = await response.json()
      if (data.success) {
        setConfig(data.config)
      }
    } catch (error) {
      console.error('Error fetching config:', error)
      toast.error('Błąd wczytywania konfiguracji')
    } finally {
      setLoading(false)
    }
  }

  const updateConfig = async (updates: Partial<ProductionCostConfig>) => {
    try {
      const response = await fetch('/api/production-costs/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      
      const data = await response.json()
      if (data.success) {
        setConfig({ ...config!, ...updates })
        toast.success('Konfiguracja zapisana')
      } else {
        toast.error('Błąd zapisywania konfiguracji')
      }
    } catch (error) {
      console.error('Error updating config:', error)
      toast.error('Błąd zapisywania konfiguracji')
    }
  }

  const calculateAnalysis = () => {
    if (!config) return

    const internalCostPerM2 = Number(config.printingPricePerM2)
    const externalCostPerM2 = Number(config.externalPrintingPricePerM2)
    const savingsPerM2 = externalCostPerM2 - internalCostPerM2
    
    const printerCosts = {
      purchaseCost: Number(config.printerPurchaseCost),
      monthlyMaintenance: Number(config.printerMonthlyMaintenance),
      lifespanMonths: Number(config.printerLifespanMonths),
      monthlyCostOfOwnership: (Number(config.printerPurchaseCost) / Number(config.printerLifespanMonths)) + Number(config.printerMonthlyMaintenance)
    }

    const breakEvenVolumeM2 = savingsPerM2 > 0 ? printerCosts.monthlyCostOfOwnership / savingsPerM2 : 0

    // Scenariusze dla różnych objętości
    const scenarios = [5, 10, 15, 20, 25, 30, 40, 50, 75, 100].map(volumeM2 => {
      const internalTotalCost = (volumeM2 * internalCostPerM2) + printerCosts.monthlyCostOfOwnership
      const externalTotalCost = volumeM2 * externalCostPerM2
      const monthlySavings = externalTotalCost - internalTotalCost
      const paybackMonths = monthlySavings > 0 ? printerCosts.purchaseCost / monthlySavings : 0

      return {
        volumeM2,
        internalTotalCost,
        externalTotalCost,
        monthlySavings,
        paybackMonths
      }
    })

    setAnalysis({
      currentMonthlyVolume: currentVolume,
      internalCostPerM2,
      externalCostPerM2,
      savingsPerM2,
      breakEvenVolumeM2,
      printerCosts,
      scenarios
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Ładowanie analizy druku...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 -mx-6 -mt-6 px-6 py-6">
        <div className="flex items-center">
          <PrinterIcon className="h-8 w-8 text-gray-600 mr-3" />
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 sm:text-3xl">Analiza kosztów druku</h1>
            <p className="text-sm text-gray-600 mt-1">Porównanie kosztów druku zewnętrznego vs własnego</p>
          </div>
        </div>
      </div>

      {/* Current Status */}
      {analysis && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CurrencyDollarIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Koszt druku zewnętrznego</p>
                <p className="text-2xl font-semibold text-gray-900">{analysis.externalCostPerM2.toFixed(2)} zł/m²</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <PrinterIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Koszt druku własnego</p>
                <p className="text-2xl font-semibold text-gray-900">{analysis.internalCostPerM2.toFixed(2)} zł/m²</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <ChartBarIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Punkt rentowności</p>
                <p className="text-2xl font-semibold text-gray-900">{analysis.breakEvenVolumeM2.toFixed(1)} m²/mies</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Configuration */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Konfiguracja kosztów</h2>
        
        {config && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className={formStyles.label}>Koszt druku zewnętrznego (zł/m²)</label>
              <input
                type="number"
                step="0.01"
                value={config.externalPrintingPricePerM2}
                onChange={(e) => updateConfig({ externalPrintingPricePerM2: parseFloat(e.target.value) })}
                className={formStyles.input}
              />
            </div>

            <div>
              <label className={formStyles.label}>Koszt druku własnego (zł/m²)</label>
              <input
                type="number"
                step="0.01"
                value={config.printingPricePerM2}
                onChange={(e) => updateConfig({ printingPricePerM2: parseFloat(e.target.value) })}
                className={formStyles.input}
              />
            </div>

            <div>
              <label className={formStyles.label}>Koszt zakupu drukarki (zł)</label>
              <input
                type="number"
                value={config.printerPurchaseCost}
                onChange={(e) => updateConfig({ printerPurchaseCost: parseFloat(e.target.value) })}
                className={formStyles.input}
              />
            </div>

            <div>
              <label className={formStyles.label}>Miesięczne utrzymanie (zł)</label>
              <input
                type="number"
                value={config.printerMonthlyMaintenance}
                onChange={(e) => updateConfig({ printerMonthlyMaintenance: parseFloat(e.target.value) })}
                className={formStyles.input}
              />
            </div>

            <div>
              <label className={formStyles.label}>Żywotność drukarki (miesiące)</label>
              <input
                type="number"
                value={config.printerLifespanMonths}
                onChange={(e) => updateConfig({ printerLifespanMonths: parseInt(e.target.value) })}
                className={formStyles.input}
              />
            </div>

            <div>
              <label className={formStyles.label}>Domyślnie używaj druku</label>
              <select
                value={config.useExternalPrintingDefault ? 'external' : 'internal'}
                onChange={(e) => updateConfig({ useExternalPrintingDefault: e.target.value === 'external' })}
                className={formStyles.select}
              >
                <option value="external">Zewnętrznego</option>
                <option value="internal">Własnego</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Current Volume Analysis */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Twoja obecna sytuacja</h2>
        
        <div className="mb-4">
          <label className={formStyles.label}>Obecna objętość druku (m²/miesiąc)</label>
          <input
            type="number"
            value={currentVolume}
            onChange={(e) => setCurrentVolume(parseFloat(e.target.value) || 0)}
            className={formStyles.input}
            style={{ maxWidth: '200px' }}
          />
        </div>

        {analysis && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-medium text-red-900">Koszt zewnętrzny</h3>
              <p className="text-2xl font-semibold text-red-700">
                {(currentVolume * analysis.externalCostPerM2).toFixed(2)} zł/mies
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-medium text-green-900">Koszt własny + drukarka</h3>
              <p className="text-2xl font-semibold text-green-700">
                {((currentVolume * analysis.internalCostPerM2) + analysis.printerCosts.monthlyCostOfOwnership).toFixed(2)} zł/mies
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900">Miesięczne oszczędności</h3>
              <p className="text-2xl font-semibold text-blue-700">
                {((currentVolume * analysis.externalCostPerM2) - ((currentVolume * analysis.internalCostPerM2) + analysis.printerCosts.monthlyCostOfOwnership)).toFixed(2)} zł
              </p>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="font-medium text-purple-900">Zwrot inwestycji</h3>
              <p className="text-2xl font-semibold text-purple-700">
                {analysis.scenarios.find(s => s.volumeM2 >= currentVolume)?.paybackMonths.toFixed(1) || '∞'} mies
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Scenarios Cards */}
      {analysis && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Analiza scenariuszy</h2>
            <p className="text-sm text-gray-600">Porównanie kosztów dla różnych objętości druku</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {analysis.scenarios.map((scenario) => {
              const isRecommended = scenario.monthlySavings > 0
              const isCurrentVolume = Math.abs(scenario.volumeM2 - currentVolume) < 2.5
              const savingsPercentage = scenario.externalTotalCost > 0 
                ? (scenario.monthlySavings / scenario.externalTotalCost) * 100 
                : 0

              return (
                <div 
                  key={scenario.volumeM2} 
                  className={`relative rounded-lg border-2 p-4 transition-all hover:shadow-lg ${
                    isCurrentVolume 
                      ? 'border-blue-500 bg-blue-50 shadow-md' 
                      : isRecommended 
                        ? 'border-green-200 bg-green-50 hover:border-green-300' 
                        : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-2 ${
                        isCurrentVolume ? 'bg-blue-500' : isRecommended ? 'bg-green-500' : 'bg-gray-400'
                      }`}></div>
                      <h3 className="font-semibold text-gray-900">
                        {scenario.volumeM2} m²/mies
                      </h3>
                    </div>
                    {isCurrentVolume && (
                      <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full font-medium">
                        OBECNY
                      </span>
                    )}
                  </div>

                  {/* Costs Comparison */}
                  <div className="space-y-3 mb-4">
                    <div className="bg-red-100 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-red-800 font-medium">🏢 Zewnętrzny</span>
                        <span className="text-lg font-bold text-red-900">
                          {scenario.externalTotalCost.toFixed(0)} zł
                        </span>
                      </div>
                    </div>

                    <div className="bg-blue-100 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-blue-800 font-medium">🏠 Własny + drukarka</span>
                        <span className="text-lg font-bold text-blue-900">
                          {scenario.internalTotalCost.toFixed(0)} zł
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Savings */}
                  <div className={`rounded-lg p-3 mb-3 ${
                    scenario.monthlySavings > 0 
                      ? 'bg-green-100 border border-green-200' 
                      : 'bg-red-100 border border-red-200'
                  }`}>
                    <div className="text-center">
                      <div className={`text-lg font-bold ${
                        scenario.monthlySavings > 0 ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {scenario.monthlySavings > 0 ? '+' : ''}{scenario.monthlySavings.toFixed(0)} zł
                      </div>
                      <div className={`text-xs ${
                        scenario.monthlySavings > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {scenario.monthlySavings > 0 ? 'oszczędności' : 'strata'} miesięcznie
                      </div>
                      {Math.abs(savingsPercentage) > 1 && (
                        <div className={`text-xs font-medium ${
                          scenario.monthlySavings > 0 ? 'text-green-700' : 'text-red-700'
                        }`}>
                          ({savingsPercentage > 0 ? '+' : ''}{savingsPercentage.toFixed(1)}%)
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Payback */}
                  {scenario.monthlySavings > 0 && (
                    <div className="text-center mb-3">
                      <div className="text-sm text-gray-600">Zwrot inwestycji</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {scenario.paybackMonths > 0 && scenario.paybackMonths < 120 
                          ? `${scenario.paybackMonths.toFixed(1)} mies` 
                          : '∞'}
                      </div>
                    </div>
                  )}

                  {/* Recommendation */}
                  <div className="text-center">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      isRecommended 
                        ? 'bg-green-600 text-white' 
                        : 'bg-red-600 text-white'
                    }`}>
                      {isRecommended ? '✅ Druk własny' : '❌ Druk zewnętrzny'}
                    </span>
                  </div>

                  {/* Progress Bar for Break-even */}
                  {analysis.breakEvenVolumeM2 > 0 && (
                    <div className="mt-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            scenario.volumeM2 >= analysis.breakEvenVolumeM2 
                              ? 'bg-green-500' 
                              : 'bg-red-500'
                          }`}
                          style={{ 
                            width: `${Math.min((scenario.volumeM2 / analysis.breakEvenVolumeM2) * 100, 100)}%` 
                          }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1 text-center">
                        {((scenario.volumeM2 / analysis.breakEvenVolumeM2) * 100).toFixed(0)}% punktu rentowności
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Break-even line indicator */}
          {analysis.breakEvenVolumeM2 > 0 && (
            <div className="mt-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-yellow-500 rounded-full mr-3"></div>
                <div>
                  <span className="font-medium text-yellow-900">
                    Punkt rentowności: {analysis.breakEvenVolumeM2.toFixed(1)} m²/miesiąc
                  </span>
                  <p className="text-sm text-yellow-700 mt-1">
                    Powyżej tej wartości druk własny zaczyna być opłacalny
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      {analysis && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Podsumowanie i rekomendacje</h2>
          
          <div className="space-y-3 text-sm">
            <p>
              <span className="font-medium">Punkt rentowności:</span> Od {analysis.breakEvenVolumeM2.toFixed(1)} m² miesięcznie opłaca się inwestycja w drukarkę.
            </p>
            
            <p>
              <span className="font-medium">Twoja obecna sytuacja:</span> 
              {currentVolume >= analysis.breakEvenVolumeM2 ? (
                <span className="text-green-600 ml-1">
                  ✅ Opłaca się druk własny! Oszczędzisz {((currentVolume * analysis.externalCostPerM2) - ((currentVolume * analysis.internalCostPerM2) + analysis.printerCosts.monthlyCostOfOwnership)).toFixed(2)} zł miesięcznie.
                </span>
              ) : (
                <span className="text-blue-600 ml-1">
                  ℹ️ Obecnie opłaca się druk zewnętrzny. Potrzebujesz {(analysis.breakEvenVolumeM2 - currentVolume).toFixed(1)} m² więcej miesięcznie, aby druk własny był rentowny.
                </span>
              )}
            </p>

            <p>
              <span className="font-medium">Koszt całkowity drukarki:</span> {analysis.printerCosts.monthlyCostOfOwnership.toFixed(2)} zł miesięcznie 
              (zakup: {analysis.printerCosts.purchaseCost} zł + utrzymanie: {analysis.printerCosts.monthlyMaintenance} zł/mies)
            </p>

            <p>
              <span className="font-medium">Oszczędność na materiałach:</span> {analysis.savingsPerM2.toFixed(2)} zł na każdym m² druku
            </p>
          </div>
        </div>
      )}
    </div>
  )
}