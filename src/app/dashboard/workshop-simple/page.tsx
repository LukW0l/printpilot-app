'use client'

import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

interface FrameTask {
  id: string
  orderItemId: string
  orderExternalId: string
  customerName: string
  itemName: string
  dimensions: string
  quantity: number
  frameType: 'THIN' | 'THICK'
  status: 'NOT_PREPARED' | 'PREPARING' | 'PREPARED' | 'MOUNTED'
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  deliveryDate: string
  materialsAvailable: boolean
  missingMaterials: string[]
  estimatedMinutes: number
  assignedTo?: string
  stretcherBars: Array<{
    length: number
    type: 'THIN' | 'THICK'
    quantity: number
    available: number
  }>
  crossbars: Array<{
    length: number
    quantity: number
    available: number
  }>
  createdAt: string
  printStatus: string
}

interface WorkshopData {
  items: FrameTask[]
  stats: {
    total: number
    queue: number
    prep: number
    ready: number
    urgent: number
    needsMaterials: number
    canStart: number
  }
}

export default function WorkshopSimplePage() {
  const [data, setData] = useState<WorkshopData | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'ready' | 'urgent' | 'my'>('all')
  const [currentUser] = useState('Obecny użytkownik')

  useEffect(() => {
    fetchWorkshopData()
  }, [])

  const fetchWorkshopData = async () => {
    try {
      const response = await fetch('/api/frame-requirements')
      if (response.ok) {
        const workshopData = await response.json()
        setData(workshopData)
      } else {
        console.error('Failed to fetch workshop data')
        toast.error('Nie udało się pobrać danych warsztatu')
      }
    } catch (error) {
      console.error('Error fetching workshop data:', error)
      toast.error('Błąd podczas pobierania danych')
    } finally {
      setLoading(false)
    }
  }

  const priorityColors = {
    LOW: 'bg-gray-100 text-gray-800 border-gray-300',
    MEDIUM: 'bg-blue-100 text-blue-800 border-blue-300',
    HIGH: 'bg-orange-100 text-orange-800 border-orange-300',
    URGENT: 'bg-red-100 text-red-800 border-red-300'
  }

  const statusColors = {
    NOT_PREPARED: 'bg-gray-50 border-gray-200',
    PREPARING: 'bg-yellow-50 border-yellow-200',
    PREPARED: 'bg-green-50 border-green-200',
    MOUNTED: 'bg-blue-50 border-blue-200'
  }

  const updateTaskStatus = async (taskId: string, newStatus: FrameTask['status']) => {
    try {
      const response = await fetch('/api/frame-requirements', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: taskId,
          status: newStatus,
          assignedTo: newStatus === 'PREPARING' ? currentUser : undefined
        })
      })

      if (response.ok) {
        // Refresh data
        fetchWorkshopData()
        
        const statusNames = {
          NOT_PREPARED: 'Kolejka',
          PREPARING: 'W przygotowaniu',
          PREPARED: 'Gotowy',
          MOUNTED: 'Zamontowany'
        }
        
        toast.success(`Status zmieniony na: ${statusNames[newStatus]}`)
      } else {
        toast.error('Nie udało się zaktualizować statusu')
      }
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Błąd podczas aktualizacji statusu')
    }
  }

  const getFilteredTasks = () => {
    if (!data) return []
    
    let filtered = data.items

    switch (filter) {
      case 'ready':
        filtered = data.items.filter(task => task.materialsAvailable && task.status === 'NOT_PREPARED')
        break
      case 'urgent':
        filtered = data.items.filter(task => task.urgency === 'URGENT' || 
          new Date(task.deliveryDate) <= new Date(Date.now() + 24 * 60 * 60 * 1000))
        break
      case 'my':
        filtered = data.items.filter(task => task.assignedTo === currentUser)
        break
    }

    return filtered.sort((a, b) => {
      // Sortuj po priorytecie i dacie dostawy
      const priorityOrder = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
      if (priorityOrder[a.urgency] !== priorityOrder[b.urgency]) {
        return priorityOrder[a.urgency] - priorityOrder[b.urgency]
      }
      return new Date(a.deliveryDate).getTime() - new Date(b.deliveryDate).getTime()
    })
  }

  const generateCuttingList = () => {
    if (!data) return
    
    const readyTasks = data.items.filter(task => task.materialsAvailable && task.status === 'NOT_PREPARED')
    
    let cuttingList = "📋 LISTA CIĘCIA BLEJTRAMÓW\n"
    cuttingList += `Data: ${new Date().toLocaleDateString('pl-PL')}\n\n`
    
    // Mapy dla różnych typów materiałów - tylko ilości
    const thinBars = new Map<number, number>()
    const thickBars = new Map<number, number>()
    const crossbars = new Map<number, number>()
    const frameSizes = new Map<string, number>()
    
    readyTasks.forEach(task => {
      // Zlicz rozmiary ramek
      const existing = frameSizes.get(task.dimensions) || 0
      frameSizes.set(task.dimensions, existing + task.quantity)
      
      task.stretcherBars.forEach(bar => {
        const targetMap = bar.type === 'THIN' ? thinBars : thickBars
        const existing = targetMap.get(bar.length) || 0
        targetMap.set(bar.length, existing + bar.quantity)
      })
      
      task.crossbars.forEach(crossbar => {
        const existing = crossbars.get(crossbar.length) || 0
        crossbars.set(crossbar.length, existing + crossbar.quantity)
      })
    })
    
    // Generuj proste listy
    if (thinBars.size > 0) {
      cuttingList += "🪵 KROSNA CIENKIE:\n"
      Array.from(thinBars.entries())
        .sort((a, b) => a[0] - b[0])
        .forEach(([length, quantity]) => {
          cuttingList += `${length}cm - ${quantity}szt\n`
        })
      cuttingList += "\n"
    }
    
    if (thickBars.size > 0) {
      cuttingList += "🪵 KROSNA GRUBE:\n"
      Array.from(thickBars.entries())
        .sort((a, b) => a[0] - b[0])
        .forEach(([length, quantity]) => {
          cuttingList += `${length}cm - ${quantity}szt\n`
        })
      cuttingList += "\n"
    }
    
    if (crossbars.size > 0) {
      cuttingList += "⚡ POPRZECZKI:\n"
      Array.from(crossbars.entries())
        .sort((a, b) => a[0] - b[0])
        .forEach(([length, quantity]) => {
          cuttingList += `${length}cm - ${quantity}szt\n`
        })
      cuttingList += "\n"
    }
    
    // Tabela rozmiarów ramek
    if (frameSizes.size > 0) {
      cuttingList += "📏 ROZMIARY RAMEK:\n"
      cuttingList += "+-------------+---------+\n"
      cuttingList += "| Rozmiar     | Ilosc   |\n"
      cuttingList += "+-------------+---------+\n"
      
      Array.from(frameSizes.entries())
        .sort((a, b) => {
          // Sortuj ramki według wysokości, potem szerokości
          const aHeight = parseInt(a[0].match(/(\d+)×/)?.[1] || '0')
          const bHeight = parseInt(b[0].match(/(\d+)×/)?.[1] || '0')
          if (aHeight !== bHeight) return aHeight - bHeight
          const aWidth = parseInt(a[0].match(/×(\d+)cm/)?.[1] || '0')
          const bWidth = parseInt(b[0].match(/×(\d+)cm/)?.[1] || '0')
          return aWidth - bWidth
        })
        .forEach(([dimensions, quantity]) => {
          const paddedDimensions = dimensions.padEnd(11)
          const paddedQuantity = `${quantity}szt`.padEnd(7)
          cuttingList += `| ${paddedDimensions} | ${paddedQuantity} |\n`
        })
      
      cuttingList += "+-------------+---------+\n"
    }
    
    navigator.clipboard.writeText(cuttingList).then(() => {
      toast.success('Lista cięcia skopiowana do schowka!')
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="text-center py-12">
          <h3 className="text-xl font-medium text-gray-900 mb-2">Brak danych</h3>
          <p className="text-gray-600">Nie udało się pobrać danych warsztatu</p>
        </div>
      </div>
    )
  }

  const filteredTasks = getFilteredTasks()
  const stats = data.stats

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">🔨 Warsztat Blejtramów</h1>
        <p className="text-gray-600">
          {new Date().toLocaleDateString('pl-PL', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
      </div>

      {/* Statystyki */}
      <div className="grid grid-cols-6 gap-4 mb-6">
        <div className="bg-white rounded-lg border p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-600">Wszystkich</div>
        </div>
        <div className="bg-green-50 rounded-lg border border-green-200 p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.canStart}</div>
          <div className="text-sm text-green-600">Można zacząć</div>
        </div>
        <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.prep}</div>
          <div className="text-sm text-yellow-600">W realizacji</div>
        </div>
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.ready}</div>
          <div className="text-sm text-blue-600">Gotowych</div>
        </div>
        <div className="bg-red-50 rounded-lg border border-red-200 p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{stats.urgent}</div>
          <div className="text-sm text-red-600">Pilnych</div>
        </div>
        <div className="bg-orange-50 rounded-lg border border-orange-200 p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">{stats.needsMaterials}</div>
          <div className="text-sm text-orange-600">Brak materiałów</div>
        </div>
      </div>

      {/* Filtry i akcje */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-3">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Wszystkie ({data.items.length})
          </button>
          <button
            onClick={() => setFilter('ready')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'ready' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Gotowe do startu ({stats.canStart})
          </button>
          <button
            onClick={() => setFilter('urgent')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'urgent' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Pilne ({stats.urgent})
          </button>
          <button
            onClick={() => setFilter('my')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'my' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Moja praca
          </button>
        </div>

        <div className="flex gap-3">
          <button
            onClick={generateCuttingList}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            📋 Lista cięcia
          </button>
          <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
            📦 Zamów materiały
          </button>
        </div>
      </div>

      {/* Tabela warsztatowa - styl jak produkcja */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Rama</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Materiały</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Ilość</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Status materiałów</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Priorytet</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Akcje</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(() => {
                // Grupuj według znormalizowanych wymiarów, ale wyświetlaj w tradycyjnym formacie
                const normalizedimensions = (dims: string) => {
                  const match = dims.match(/(\d+)×(\d+)cm/)
                  if (match) {
                    const [, w, h] = match
                    const width = parseInt(w)
                    const height = parseInt(h)
                    // Dla grupowania: zawsze mniejszy × większy
                    const normalized = `${Math.min(width, height)}×${Math.max(width, height)}cm`
                    // Dla wyświetlania: zawsze większy × mniejszy (tradycyjnie)
                    const display = `${Math.max(width, height)}×${Math.min(width, height)}cm`
                    return { normalized, display }
                  }
                  return { normalized: dims, display: dims }
                }
                
                const groupedTasks = new Map()
                filteredTasks.forEach(task => {
                  const normalizedDims = normalizedimensions(task.dimensions)
                  const key = `${normalizedDims.normalized}-${task.frameType}`
                  
                  if (!groupedTasks.has(key)) {
                    groupedTasks.set(key, {
                      ...task,
                      dimensions: normalizedDims.display, // Używaj format do wyświetlania
                      normalizedDimensions: normalizedDims.normalized, // Zachowaj dla obliczeń
                      quantity: task.quantity,
                      originalTasks: [task]
                    })
                  } else {
                    const existing = groupedTasks.get(key)
                    existing.quantity += task.quantity
                    existing.originalTasks.push(task)
                    // POPRAWKA: Przelicz materiały na podstawie ilości ramek zamiast sumowania
                    // Nie sumuj, tylko przelicz na nowo dla całkowitej ilości
                  }
                })
                
                // POPRAWKA: Przelicz materiały dla zgrupowanych zadań i sortuj według szerokości
                return Array.from(groupedTasks.values())
                  .sort((a, b) => {
                    // Sortuj według wysokości (pierwszy wymiar), potem według szerokości
                    const aHeight = parseInt(a.dimensions.match(/(\d+)×/)?.[1] || '0')
                    const bHeight = parseInt(b.dimensions.match(/(\d+)×/)?.[1] || '0')
                    const aWidth = parseInt(a.dimensions.match(/×(\d+)cm/)?.[1] || '0')
                    const bWidth = parseInt(b.dimensions.match(/×(\d+)cm/)?.[1] || '0')
                    
                    // Najpierw sortuj według wysokości, potem według szerokości
                    if (aHeight !== bHeight) {
                      return aHeight - bHeight
                    }
                    return aWidth - bWidth
                  })
                  .map(groupedTask => {
                  // Jeśli to zgrupowane zadanie, przelicz materiały na podstawie wymiarów i ilości
                  if (groupedTask.originalTasks && groupedTask.originalTasks.length > 1) {
                    const dims = groupedTask.dimensions.match(/(\d+)×(\d+)cm/)
                    if (dims) {
                      const width = parseInt(dims[1])
                      const height = parseInt(dims[2])
                      const totalQuantity = groupedTask.quantity
                      
                      // Przelicz materiały dla całkowitej ilości
                      groupedTask.stretcherBars = [
                        { length: width, type: groupedTask.frameType, quantity: 2 * totalQuantity, available: 50 },
                        { length: height, type: groupedTask.frameType, quantity: 2 * totalQuantity, available: 50 }
                      ]
                      
                      // Poprzeczki dla dużych ramek (>120cm)
                      if (width > 120 || height > 120) {
                        groupedTask.crossbars = [
                          { length: Math.min(width, height), quantity: 1 * totalQuantity, available: 20 }
                        ]
                      } else {
                        groupedTask.crossbars = []
                      }
                    }
                  }
                  return groupedTask
                })
              })().map((task) => {
                // Agreguj materiały po typie
                const typeMap = new Map()
                task.stretcherBars.forEach((bar: any) => {
                  if (!typeMap.has(bar.type)) {
                    typeMap.set(bar.type, new Map())
                  }
                  const lengthMap = typeMap.get(bar.type)
                  if (lengthMap.has(bar.length)) {
                    lengthMap.set(bar.length, lengthMap.get(bar.length) + bar.quantity)
                  } else {
                    lengthMap.set(bar.length, bar.quantity)
                  }
                })
                
                const materialsText = Array.from(typeMap.entries()).map(([type, lengthMap]) => {
                  const lengths = Array.from(lengthMap.entries())
                    .map((entry: any) => `${entry[1]}× ${entry[0]}cm`)
                    .join(', ')
                  return `${type}: ${lengths}`
                }).join(' | ')
                
                return (
                  <tr key={task.id} className={`hover:bg-gray-50 transition-colors ${(statusColors as any)[task.status]}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div>
                          <div className="text-lg font-bold text-blue-600">{task.dimensions}</div>
                          <div className="text-sm text-gray-500">{task.frameType} • ~{task.estimatedMinutes}min</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 font-mono">{materialsText}</div>
                      {task.crossbars.length > 0 && (
                        <div className="text-sm text-blue-600 font-mono">+ {task.crossbars[0].quantity}× {task.crossbars[0].length}cm poprzeczka</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="text-lg font-bold text-gray-900">{task.quantity}szt</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${task.materialsAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {task.materialsAvailable ? '✅ Dostępne' : '❌ Brak'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {(() => {
                        // Priorytet - najwyższy z grupy
                        const maxUrgency = task.originalTasks ? 
                          task.originalTasks.reduce((max: any, t: any) => {
                            const priorities = {'LOW': 1, 'MEDIUM': 2, 'HIGH': 3, 'URGENT': 4}
                            return (priorities as any)[t.urgency] > (priorities as any)[max.urgency] ? t : max
                          }).urgency : task.urgency
                        
                        return (
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            maxUrgency === 'URGENT' ? 'bg-red-100 text-red-800' :
                            maxUrgency === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                            maxUrgency === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {maxUrgency === 'URGENT' ? '🔥 PILNE' :
                             maxUrgency === 'HIGH' ? '⚡ WYSOKIE' :
                             maxUrgency === 'MEDIUM' ? '📅 ŚREDNIE' : '📋 NORMALNE'}
                          </span>
                        )
                      })()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end">
                        {task.originalTasks ? (
                          <span className="text-sm text-gray-600">
                            {task.originalTasks.length} zadań zgrupowanych
                          </span>
                        ) : (
                          <>
                            {task.status === 'NOT_PREPARED' && task.materialsAvailable && (
                              <button
                                onClick={() => updateTaskStatus(task.id, 'PREPARING')}
                                className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                              >
                                🔨 Zaczynam
                              </button>
                            )}
                            
                            {task.status === 'PREPARING' && (
                              <button
                                onClick={() => updateTaskStatus(task.id, 'PREPARED')}
                                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                              >
                                ✅ Gotowe
                              </button>
                            )}
                            
                            {task.status === 'PREPARED' && (
                              <button
                                onClick={() => updateTaskStatus(task.id, 'MOUNTED')}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                              >
                                🖼️ Zmontowano
                              </button>
                            )}

                            {!task.materialsAvailable && (
                              <button className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors">
                                📦 Zamów
                              </button>
                            )}
                            
                            {task.status === 'MOUNTED' && (
                              <span className="bg-green-100 text-green-800 px-3 py-1 rounded text-sm font-medium">
                                ✅ Ukończone
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {filteredTasks.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">Świetna robota!</h3>
          <p className="text-gray-600">
            {filter === 'all' ? 'Brak zadań do wykonania' :
             filter === 'ready' ? 'Wszystkie zadania z materiałami zostały rozpoczęte' :
             filter === 'urgent' ? 'Brak pilnych zadań' :
             'Brak przypisanych zadań'}
          </p>
        </div>
      )}
    </div>
  )
}