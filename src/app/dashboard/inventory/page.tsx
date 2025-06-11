'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

interface StretcherBarInventory {
  id: string
  length: number
  type: 'THIN' | 'THICK'
  stock: number
  minStock: number
  createdAt: string
  updatedAt: string
}

interface CrossbarInventory {
  id: string
  length: number
  stock: number
  minStock: number
  createdAt: string
  updatedAt: string
}

interface LowStockItem {
  id: string
  type: 'stretcher' | 'crossbar'
  frameType?: 'THIN' | 'THICK'
  length: number
  currentStock: number
  minStock: number
  deficit: number
}

export default function InventoryPage() {
  const [stretcherBars, setStretcherBars] = useState<StretcherBarInventory[]>([])
  const [crossbars, setCrossbars] = useState<CrossbarInventory[]>([])
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [editingField, setEditingField] = useState<{ itemId: string, field: 'stock' | 'minStock' } | null>(null)

  useEffect(() => {
    fetchInventory()
  }, [])

  useEffect(() => {
    if (editingItem) {
      // Focus on the stock input when editing starts
      setTimeout(() => {
        const stockInput = document.getElementById(`stock-${editingItem}`) as HTMLInputElement
        if (stockInput) {
          stockInput.focus()
          stockInput.select()
        }
      }, 10)
    }
  }, [editingItem])
  
  const checkLowStock = () => {
    const lowStock: LowStockItem[] = []
    
    stretcherBars.forEach(item => {
      if (item.stock <= item.minStock) {
        lowStock.push({
          id: item.id,
          type: 'stretcher',
          frameType: item.type,
          length: item.length,
          currentStock: item.stock,
          minStock: item.minStock,
          deficit: item.minStock - item.stock + 5
        })
      }
    })
    
    crossbars.forEach(item => {
      if (item.stock <= item.minStock) {
        lowStock.push({
          id: item.id,
          type: 'crossbar',
          length: item.length,
          currentStock: item.stock,
          minStock: item.minStock,
          deficit: item.minStock - item.stock + 5
        })
      }
    })
    
    setLowStockItems(lowStock)
  }

  const fetchInventory = async () => {
    try {
      setLoading(true)
      
      // Clear existing state first to force fresh data
      setStretcherBars([])
      setCrossbars([])
      setLowStockItems([])
      setEditingItem(null)
      setEditingField(null)
      
      // Fetch all inventory data with cache busting
      const timestamp = Date.now()
      const [stretcherResponse, crossbarResponse, lowStockResponse] = await Promise.all([
        fetch(`/api/inventory/stretcher-bars?t=${timestamp}`, { 
          cache: 'no-cache',
          headers: { 'Cache-Control': 'no-cache' }
        }),
        fetch(`/api/inventory/crossbars?t=${timestamp}`, { 
          cache: 'no-cache',
          headers: { 'Cache-Control': 'no-cache' }
        }),
        fetch(`/api/inventory/stock-check?lowStock=true&t=${timestamp}`, { 
          cache: 'no-cache',
          headers: { 'Cache-Control': 'no-cache' }
        })
      ])
      
      const stretcherData = await stretcherResponse.json()
      const crossbarData = await crossbarResponse.json()
      const lowStockData = await lowStockResponse.json()
      
      console.log('Fresh crossbar data loaded:', crossbarData.length, 'items')
      console.log('First crossbar ID:', crossbarData[0]?.id)
      
      // Remove duplicates by ID  
      const uniqueCrossbars = crossbarData.filter((item: any, index: number, arr: any[]) => 
        arr.findIndex((x: any) => x.id === item.id) === index
      )
      
      setStretcherBars(stretcherData)
      setCrossbars(uniqueCrossbars)
      setLowStockItems(lowStockData.lowStockItems || [])
    } catch (error) {
      console.error('Error fetching inventory:', error)
      toast.error('Nie udało się pobrać stanu magazynu')
    } finally {
      setLoading(false)
    }
  }

  const updateStretcherBarStock = async (id: string, stock: number, minStock: number) => {
    try {
      const response = await fetch('/api/inventory/stretcher-bars', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, stock, minStock })
      })
      
      if (response.ok) {
        // Update local state instead of refetching
        setStretcherBars(prev => prev.map(item => 
          item.id === id ? { ...item, stock, minStock } : item
        ))
        
        // Update low stock items
        checkLowStock()
        
        toast.success('Zaktualizowano stan listew nośnych')
        setEditingItem(null)
        setEditingField(null)
      } else {
        const errorData = await response.json()
        console.error('API Error:', errorData)
        toast.error('Błąd API: ' + (errorData.error || 'Nieznany błąd'))
      }
    } catch (error) {
      console.error('Network error:', error)
      toast.error('Nie udało się zaktualizować stanu magazynu')
    }
  }

  const updateCrossbarStock = async (id: string, stock: number, minStock: number) => {
    try {
      console.log('Updating crossbar:', { id, stock, minStock })
      
      // Verify this ID exists in API before attempting update
      const checkResponse = await fetch('/api/inventory/crossbars')
      const allCrossbars = await checkResponse.json()
      const itemExists = allCrossbars.find((item: any) => item.id === id)
      console.log('Item exists in API?', !!itemExists, 'ID:', id)
      if (!itemExists) {
        console.error('ID not found in database:', id)
        console.log('Available IDs:', allCrossbars.map((item: any) => ({id: item.id, length: item.length})))
        toast.error(`ID ${id} nie istnieje w bazie danych`)
        return
      }
      const response = await fetch('/api/inventory/crossbars', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, stock, minStock })
      })
      
      if (response.ok) {
        // Update local state instead of refetching
        setCrossbars(prev => prev.map(item => 
          item.id === id ? { ...item, stock, minStock } : item
        ))
        
        // Update low stock items
        checkLowStock()
        
        toast.success('Zaktualizowano stan poprzeczek')
        setEditingItem(null)
        setEditingField(null)
      } else {
        const errorData = await response.json()
        console.error('API Error:', errorData)
        toast.error('Błąd API: ' + (errorData.error || 'Nieznany błąd'))
      }
    } catch (error) {
      console.error('Network error:', error)
      toast.error('Nie udało się zaktualizować stanu magazynu')
    }
  }

  const addStretcherBar = async (type: 'THIN' | 'THICK', length: number, stock: number, minStock: number) => {
    try {
      const response = await fetch('/api/inventory/stretcher-bars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, length, stock, minStock })
      })
      
      if (response.ok) {
        toast.success('Dodano listwę nośną')
        fetchInventory()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Nie udało się dodać listwy nośnej')
      }
    } catch (error) {
      toast.error('Nie udało się dodać listwy nośnej')
    }
  }

  const addCrossbar = async (length: number, stock: number, minStock: number) => {
    try {
      const response = await fetch('/api/inventory/crossbars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ length, stock, minStock })
      })
      
      if (response.ok) {
        toast.success('Dodano poprzeczkę')
        fetchInventory()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Nie udało się dodać poprzeczki')
      }
    } catch (error) {
      toast.error('Nie udało się dodać poprzeczki')
    }
  }

  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailData, setEmailData] = useState<any>(null)
  const [supplierEmail, setSupplierEmail] = useState('')

  const generateReorderEmail = async () => {
    if (lowStockItems.length === 0) {
      toast('Żadne elementy nie wymagają uzupełnienia')
      return
    }

    try {
      const response = await fetch('/api/reorder-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: supplierEmail || 'supplier@example.com',
          includeAllLowStock: true
        })
      })
      
      const result = await response.json()
      
      if (response.ok) {
        setEmailData(result.email)
        setShowEmailModal(true)
      } else {
        toast.error(result.error || 'Nie udało się wygenerować e-maila zamówienia')
      }
    } catch (error) {
      toast.error('Nie udało się wygenerować e-maila zamówienia')
    }
  }

  const copyEmailToClipboard = () => {
    if (!emailData) return
    
    const emailText = `To: ${emailData.to}\nSubject: ${emailData.subject}\n\n${emailData.body}`
    
    navigator.clipboard.writeText(emailText).then(() => {
      toast.success('E-mail skopiowany do schowka')
    }).catch(() => {
      toast.error('Nie udało się skopiować do schowka')
    })
  }

  const generateReorderList = () => {
    if (lowStockItems.length === 0) {
      toast('Żadne elementy nie wymagają uzupełnienia')
      return
    }

    let emailContent = "Temat: Wymagane uzupełnienie komponentów ram\n\n"
    emailContent += "Następujące komponenty ram są poniżej minimalnego poziomu zapasów i wymagają uzupełnienia:\n\n"
    
    const stretcherItems = lowStockItems.filter(item => item.type === 'stretcher')
    const crossbarItems = lowStockItems.filter(item => item.type === 'crossbar')
    
    if (stretcherItems.length > 0) {
      emailContent += "LISTWY NOŚNE:\n"
      stretcherItems.forEach(item => {
        emailContent += `- ${item.frameType} ${item.length}cm: Aktualny stan ${item.currentStock}, Min. zapas ${item.minStock}, Potrzeba ${item.deficit} więcej\n`
      })
      emailContent += "\n"
    }
    
    if (crossbarItems.length > 0) {
      emailContent += "POPRZECZKI:\n"
      crossbarItems.forEach(item => {
        emailContent += `- ${item.length}cm: Aktualny stan ${item.currentStock}, Min. zapas ${item.minStock}, Potrzeba ${item.deficit} więcej\n`
      })
      emailContent += "\n"
    }
    
    emailContent += `Łączna ilość elementów do uzupełnienia: ${lowStockItems.length}\n`
    emailContent += `Wygenerowano: ${new Date().toLocaleString()}\n`

    // Copy to clipboard
    navigator.clipboard.writeText(emailContent).then(() => {
      toast.success('Lista uzupełnień skopiowana do schowka')
    }).catch(() => {
      toast.error('Nie udało się skopiować do schowka')
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 sm:mb-6">
        <div className="space-y-4">
          {/* Title Row */}
          <div className="flex items-center">
            <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-base sm:text-lg">📦</span>
            </div>
            <div className="ml-3 sm:ml-4">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-gray-900 via-indigo-900 to-purple-900 bg-clip-text text-transparent">
                Zarządzanie Magazynem
              </h1>
            </div>
          </div>

          {/* Actions Row */}
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <button
              onClick={fetchInventory}
              className="inline-flex items-center px-3 py-2 sm:px-4 sm:py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <span className="hidden sm:inline">🔄 Odśwież dane</span>
              <span className="sm:hidden">🔄 Odśwież</span>
            </button>
            
            {lowStockItems.length > 0 && (
              <>
                <button
                  onClick={generateReorderEmail}
                  className="inline-flex items-center px-3 py-2 sm:px-4 sm:py-2.5 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <span className="hidden sm:inline">📧 E-mail ({lowStockItems.length} pozycji)</span>
                  <span className="sm:hidden">📧 E-mail ({lowStockItems.length})</span>
                </button>
                <button
                  onClick={generateReorderList}
                  className="inline-flex items-center px-3 py-2 sm:px-4 sm:py-2.5 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <span className="hidden sm:inline">📋 Kopiuj Listę</span>
                  <span className="sm:hidden">📋 Lista</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Alert Summary */}
        {lowStockItems.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
            <h3 className="font-medium text-red-900 mb-1 sm:mb-2 text-sm sm:text-base">⚠️ Alert Niskiego Stanu</h3>
            <p className="text-red-700 text-xs sm:text-sm">
              {lowStockItems.length} pozycji jest poniżej minimalnego poziomu zapasów i wymaga uzupełnienia.
            </p>
          </div>
        )}
      </div>

      {/* Responsive Tables */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        {/* THIN Stretcher Bars Table */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-3 sm:px-4 py-2 sm:py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-xs sm:text-sm font-medium text-gray-900">
              Listwy Cienkie ({stretcherBars.filter(item => item.type === 'THIN').length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-1 sm:px-2 py-1 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                    Długość
                  </th>
                  <th className="px-1 sm:px-2 py-1 text-center text-xs font-medium text-gray-900 uppercase tracking-wider">
                    Stan
                  </th>
                  <th className="hidden sm:table-cell px-1 sm:px-2 py-1 text-center text-xs font-medium text-gray-900 uppercase tracking-wider">
                    Min
                  </th>
                  <th className="px-1 sm:px-2 py-1 text-center text-xs font-medium text-gray-900 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-1 sm:px-2 py-1 text-center text-xs font-medium text-gray-900 uppercase tracking-wider">
                    Akcje
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stretcherBars
                  .filter(item => item.type === 'THIN')
                  .sort((a, b) => a.length - b.length)
                  .map((item) => {
                    const isLowStock = item.stock <= item.minStock
                    const isEditing = editingItem === item.id
                    
                    return (
                      <tr key={item.id} className={`hover:bg-gray-50 ${isLowStock ? 'bg-red-50' : ''}`}>
                        <td className="px-2 py-1 whitespace-nowrap text-sm font-medium text-gray-900 w-20">
                          {item.length}cm
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap text-center w-16 relative">
                          {isEditing ? (
                            <input
                              type="number"
                              defaultValue={item.stock}
                              className="absolute inset-0 m-0.5 text-center text-xs rounded border-gray-300 text-gray-900"
                              id={`stock-${item.id}`}
                              autoFocus
                              onFocus={(e) => e.target.select()}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const stockInput = document.getElementById(`stock-${item.id}`) as HTMLInputElement
                                  const minStockInput = document.getElementById(`minStock-${item.id}`) as HTMLInputElement
                                  const stockValue = parseInt(stockInput?.value || '0')
                                  const minStockValue = parseInt(minStockInput?.value || '0')
                                  if (!isNaN(stockValue) && !isNaN(minStockValue)) {
                                    updateCrossbarStock(item.id, stockValue, minStockValue)
                                  }
                                }
                              }}
                            />
                          ) : (
                            <span 
                              className="text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                              onClick={() => setEditingItem(item.id)}
                            >
                              {item.stock}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap text-center w-12 relative">
                          {isEditing ? (
                            <input
                              type="number"
                              defaultValue={item.minStock}
                              className="absolute inset-0 m-0.5 text-center text-xs rounded border-gray-300 text-gray-900"
                              id={`minStock-${item.id}`}
                              onFocus={(e) => e.target.select()}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const stockInput = document.getElementById(`stock-${item.id}`) as HTMLInputElement
                                  const minStockInput = document.getElementById(`minStock-${item.id}`) as HTMLInputElement
                                  const stockValue = parseInt(stockInput?.value || '0')
                                  const minStockValue = parseInt(minStockInput?.value || '0')
                                  if (!isNaN(stockValue) && !isNaN(minStockValue)) {
                                    updateCrossbarStock(item.id, stockValue, minStockValue)
                                  }
                                }
                              }}
                            />
                          ) : (
                            <span 
                              className="text-xs text-gray-900 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                              onClick={() => setEditingItem(item.id)}
                            >
                              {item.minStock}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap text-center w-12">
                          <span className={`w-3 h-3 rounded-full inline-block ${
                            isLowStock ? 'bg-red-500' : 'bg-green-500'
                          }`} title={isLowStock ? 'Niski Stan' : 'OK'}></span>
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap text-center text-xs w-20">
                          {isEditing ? (
                            <div className="flex gap-1 justify-center">
                              <button
                                onClick={() => {
                                  const stockInput = document.getElementById(`stock-${item.id}`) as HTMLInputElement
                                  const minStockInput = document.getElementById(`minStock-${item.id}`) as HTMLInputElement
                                  const stockValue = parseInt(stockInput?.value || '0')
                                  const minStockValue = parseInt(minStockInput?.value || '0')
                                  if (!isNaN(stockValue) && !isNaN(minStockValue)) {
                                    updateCrossbarStock(item.id, stockValue, minStockValue)
                                  }
                                }}
                                className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs"
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => setEditingItem(null)}
                                className="bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded text-xs"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setEditingItem(item.id)}
                              className="text-blue-600 hover:text-blue-900 text-xs"
                            >
                              Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </div>

        {/* THICK Stretcher Bars Table */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-900">
              Listwy Grube ({stretcherBars.filter(item => item.type === 'THICK').length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 table-fixed">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-900 uppercase tracking-wider w-20">
                    Długość
                  </th>
                  <th className="px-2 py-1 text-center text-xs font-medium text-gray-900 uppercase tracking-wider w-16">
                    Stan
                  </th>
                  <th className="px-2 py-1 text-center text-xs font-medium text-gray-900 uppercase tracking-wider w-12">
                    Min
                  </th>
                  <th className="px-2 py-1 text-center text-xs font-medium text-gray-900 uppercase tracking-wider w-12">
                    Status
                  </th>
                  <th className="px-2 py-1 text-center text-xs font-medium text-gray-900 uppercase tracking-wider w-20">
                    Akcje
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stretcherBars
                  .filter(item => item.type === 'THICK')
                  .sort((a, b) => a.length - b.length)
                  .map((item) => {
                    const isLowStock = item.stock <= item.minStock
                    const isEditing = editingItem === item.id
                    
                    return (
                      <tr key={item.id} className={`hover:bg-gray-50 ${isLowStock ? 'bg-red-50' : ''}`}>
                        <td className="px-2 py-1 whitespace-nowrap text-sm font-medium text-gray-900 w-20">
                          {item.length}cm
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap text-center w-16 relative">
                          {isEditing ? (
                            <input
                              type="number"
                              defaultValue={item.stock}
                              className="absolute inset-0 m-0.5 text-center text-xs rounded border-gray-300 text-gray-900"
                              id={`stock-${item.id}`}
                              autoFocus
                              onFocus={(e) => e.target.select()}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const stockInput = document.getElementById(`stock-${item.id}`) as HTMLInputElement
                                  const minStockInput = document.getElementById(`minStock-${item.id}`) as HTMLInputElement
                                  const stockValue = parseInt(stockInput?.value || '0')
                                  const minStockValue = parseInt(minStockInput?.value || '0')
                                  if (!isNaN(stockValue) && !isNaN(minStockValue)) {
                                    updateCrossbarStock(item.id, stockValue, minStockValue)
                                  }
                                }
                              }}
                            />
                          ) : (
                            <span 
                              className="text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                              onClick={() => setEditingItem(item.id)}
                            >
                              {item.stock}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap text-center w-12 relative">
                          {isEditing ? (
                            <input
                              type="number"
                              defaultValue={item.minStock}
                              className="absolute inset-0 m-0.5 text-center text-xs rounded border-gray-300 text-gray-900"
                              id={`minStock-${item.id}`}
                              onFocus={(e) => e.target.select()}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const stockInput = document.getElementById(`stock-${item.id}`) as HTMLInputElement
                                  const minStockInput = document.getElementById(`minStock-${item.id}`) as HTMLInputElement
                                  const stockValue = parseInt(stockInput?.value || '0')
                                  const minStockValue = parseInt(minStockInput?.value || '0')
                                  if (!isNaN(stockValue) && !isNaN(minStockValue)) {
                                    updateCrossbarStock(item.id, stockValue, minStockValue)
                                  }
                                }
                              }}
                            />
                          ) : (
                            <span 
                              className="text-xs text-gray-900 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                              onClick={() => setEditingItem(item.id)}
                            >
                              {item.minStock}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap text-center w-12">
                          <span className={`w-3 h-3 rounded-full inline-block ${
                            isLowStock ? 'bg-red-500' : 'bg-green-500'
                          }`} title={isLowStock ? 'Niski Stan' : 'OK'}></span>
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap text-center text-xs w-20">
                          {isEditing ? (
                            <div className="flex gap-1 justify-center">
                              <button
                                onClick={() => {
                                  const stockInput = document.getElementById(`stock-${item.id}`) as HTMLInputElement
                                  const minStockInput = document.getElementById(`minStock-${item.id}`) as HTMLInputElement
                                  const stockValue = parseInt(stockInput?.value || '0')
                                  const minStockValue = parseInt(minStockInput?.value || '0')
                                  if (!isNaN(stockValue) && !isNaN(minStockValue)) {
                                    updateCrossbarStock(item.id, stockValue, minStockValue)
                                  }
                                }}
                                className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs"
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => setEditingItem(null)}
                                className="bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded text-xs"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setEditingItem(item.id)}
                              className="text-blue-600 hover:text-blue-900 text-xs"
                            >
                              Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Crossbars Table */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-900">
              Poprzeczki ({crossbars.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 table-fixed">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-900 uppercase tracking-wider w-20">
                    Długość
                  </th>
                  <th className="px-2 py-1 text-center text-xs font-medium text-gray-900 uppercase tracking-wider w-16">
                    Stan
                  </th>
                  <th className="px-2 py-1 text-center text-xs font-medium text-gray-900 uppercase tracking-wider w-12">
                    Min
                  </th>
                  <th className="px-2 py-1 text-center text-xs font-medium text-gray-900 uppercase tracking-wider w-12">
                    Status
                  </th>
                  <th className="px-2 py-1 text-center text-xs font-medium text-gray-900 uppercase tracking-wider w-20">
                    Akcje
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {crossbars
                  .sort((a, b) => a.length - b.length)
                  .map((item, index) => {
                    const isLowStock = item.stock <= item.minStock
                    const isEditing = editingItem === item.id
                    
                    return (
                      <tr key={item.id} className={`hover:bg-gray-50 ${isLowStock ? 'bg-red-50' : ''}`}>
                        <td className="px-2 py-1 whitespace-nowrap text-sm font-medium text-gray-900 w-20">
                          {item.length}cm
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap text-center w-16 relative">
                          {isEditing ? (
                            <input
                              type="number"
                              defaultValue={item.stock}
                              className="absolute inset-0 m-0.5 text-center text-xs rounded border-gray-300 text-gray-900"
                              id={`stock-${item.id}`}
                              autoFocus
                              onFocus={(e) => e.target.select()}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const stockInput = document.getElementById(`stock-${item.id}`) as HTMLInputElement
                                  const minStockInput = document.getElementById(`minStock-${item.id}`) as HTMLInputElement
                                  const stockValue = parseInt(stockInput?.value || '0')
                                  const minStockValue = parseInt(minStockInput?.value || '0')
                                  if (!isNaN(stockValue) && !isNaN(minStockValue)) {
                                    updateCrossbarStock(item.id, stockValue, minStockValue)
                                  }
                                }
                              }}
                            />
                          ) : (
                            <span 
                              className="text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                              onClick={() => setEditingItem(item.id)}
                            >
                              {item.stock}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap text-center w-12 relative">
                          {isEditing ? (
                            <input
                              type="number"
                              defaultValue={item.minStock}
                              className="absolute inset-0 m-0.5 text-center text-xs rounded border-gray-300 text-gray-900"
                              id={`minStock-${item.id}`}
                              onFocus={(e) => e.target.select()}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const stockInput = document.getElementById(`stock-${item.id}`) as HTMLInputElement
                                  const minStockInput = document.getElementById(`minStock-${item.id}`) as HTMLInputElement
                                  const stockValue = parseInt(stockInput?.value || '0')
                                  const minStockValue = parseInt(minStockInput?.value || '0')
                                  if (!isNaN(stockValue) && !isNaN(minStockValue)) {
                                    updateCrossbarStock(item.id, stockValue, minStockValue)
                                  }
                                }
                              }}
                            />
                          ) : (
                            <span 
                              className="text-xs text-gray-900 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                              onClick={() => setEditingItem(item.id)}
                            >
                              {item.minStock}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap text-center w-12">
                          <span className={`w-3 h-3 rounded-full inline-block ${
                            isLowStock ? 'bg-red-500' : 'bg-green-500'
                          }`} title={isLowStock ? 'Niski Stan' : 'OK'}></span>
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap text-center text-xs w-20">
                          {isEditing ? (
                            <div className="flex gap-1 justify-center">
                              <button
                                onClick={() => {
                                  const stockInput = document.getElementById(`stock-${item.id}`) as HTMLInputElement
                                  const minStockInput = document.getElementById(`minStock-${item.id}`) as HTMLInputElement
                                  const stockValue = parseInt(stockInput?.value || '0')
                                  const minStockValue = parseInt(minStockInput?.value || '0')
                                  if (!isNaN(stockValue) && !isNaN(minStockValue)) {
                                    updateCrossbarStock(item.id, stockValue, minStockValue)
                                  }
                                }}
                                className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs"
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => setEditingItem(null)}
                                className="bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded text-xs"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setEditingItem(item.id)}
                              className="text-blue-600 hover:text-blue-900 text-xs"
                            >
                              Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Email Modal */}
      {showEmailModal && emailData && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">E-mail Zamówienia</h3>
                <button
                  onClick={() => setShowEmailModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Email Header */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Do:</span> {emailData.to}
                    </div>
                    <div>
                      <span className="font-medium">Temat:</span> {emailData.subject}
                    </div>
                  </div>
                </div>
                
                {/* Email Body */}
                <div className="bg-white border border-gray-300 rounded-lg p-4 max-h-96 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm text-gray-900 font-mono">
                    {emailData.body}
                  </pre>
                </div>
                
                {/* Summary */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Podsumowanie Zamówienia</h4>
                  <div className="grid grid-cols-4 gap-4 text-sm text-blue-700">
                    <div>Komponenty: {emailData.summary.totalComponents}</div>
                    <div>Łączne Sztuki: {emailData.summary.totalPieces}</div>
                    <div>Listwy Nośne: {emailData.summary.stretcherBars}</div>
                    <div>Poprzeczki: {emailData.summary.crossbars}</div>
                  </div>
                </div>
                
                {/* Supplier Email Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    E-mail Dostawcy
                  </label>
                  <input
                    type="email"
                    value={supplierEmail}
                    onChange={(e) => setSupplierEmail(e.target.value)}
                    placeholder="supplier@example.com"
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                
                {/* Action Buttons */}
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowEmailModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                  >
                    Zamknij
                  </button>
                  <button
                    onClick={copyEmailToClipboard}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                  >
                    Kopiuj E-mail
                  </button>
                  <a
                    href={`mailto:${supplierEmail || emailData.to}?subject=${encodeURIComponent(emailData.subject)}&body=${encodeURIComponent(emailData.body)}`}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700"
                  >
                    Otwórz w Kliencie E-mail
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}