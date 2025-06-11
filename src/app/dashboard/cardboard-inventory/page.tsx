'use client'

import { useState, useEffect } from 'react'

interface CardboardItem {
  id: string
  width: number
  height: number
  stock: number
  minStock: number
  price: number
}

export default function CardboardInventoryPage() {
  const [cardboards, setCardboards] = useState<CardboardItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newCardboard, setNewCardboard] = useState({
    width: '',
    height: '',
    stock: '0',
    minStock: '10',
    price: '1.0'
  })

  useEffect(() => {
    fetchCardboards()
  }, [])

  const fetchCardboards = async () => {
    try {
      const response = await fetch('/api/production-costs/cardboard')
      const data = await response.json()
      setCardboards(data)
    } catch (error) {
      console.error('Error fetching cardboards:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateCardboard = async (id: string, updates: Partial<CardboardItem>) => {
    try {
      const response = await fetch('/api/production-costs/cardboard', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates })
      })
      
      if (response.ok) {
        await fetchCardboards()
      }
    } catch (error) {
      console.error('Error updating cardboard:', error)
    }
  }

  const deleteCardboard = async (id: string, cardboard: CardboardItem) => {
    if (!confirm(`Czy na pewno chcesz usunąć karton ${cardboard.width}×${cardboard.height} cm?`)) {
      return
    }

    try {
      const response = await fetch('/api/production-costs/cardboard', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })
      
      if (response.ok) {
        await fetchCardboards()
      } else {
        alert('Nie udało się usunąć kartonu')
      }
    } catch (error) {
      console.error('Error deleting cardboard:', error)
      alert('Błąd podczas usuwania kartonu')
    }
  }

  const addCardboard = async () => {
    if (!newCardboard.width || !newCardboard.height) {
      alert('Proszę podać wymiary kartonu')
      return
    }

    try {
      const response = await fetch('/api/production-costs/cardboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          width: parseInt(newCardboard.width),
          height: parseInt(newCardboard.height),
          stock: parseInt(newCardboard.stock),
          minStock: parseInt(newCardboard.minStock),
          price: parseFloat(newCardboard.price)
        })
      })
      
      if (response.ok) {
        await fetchCardboards()
        setNewCardboard({
          width: '',
          height: '',
          stock: '0',
          minStock: '10',
          price: '1.0'
        })
        setShowAddForm(false)
      } else {
        const error = await response.json()
        alert(error.error || 'Nie udało się dodać kartonu')
      }
    } catch (error) {
      console.error('Error adding cardboard:', error)
      alert('Błąd podczas dodawania kartonu')
    }
  }

  const getStockStatus = (stock: number, minStock: number) => {
    if (stock === 0) return { color: 'bg-red-100 text-red-800', text: 'Brak w Magazynie' }
    if (stock <= minStock) return { color: 'bg-yellow-100 text-yellow-800', text: 'Niski Stan' }
    return { color: 'bg-green-100 text-green-800', text: 'W Magazynie' }
  }

  if (loading) {
    return <div className="p-6">Ładowanie...</div>
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">📦 Magazyn Kartonów</h1>
            <p className="text-gray-600 mt-2">Zarządzaj magazynem podkładek kartonowych do ram obrazowych</p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm hover:shadow-md"
          >
            <span className="mr-2 text-lg">➕</span>
            Dodaj nowy rozmiar
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rozmiar (cm)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aktualny Stan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Min. Zapas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cena (PLN)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Akcje
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {cardboards.map((item) => {
                const status = getStockStatus(item.stock, item.minStock)
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {item.width} × {item.height}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        value={item.stock}
                        onChange={(e) => updateCardboard(item.id, { stock: parseInt(e.target.value) })}
                        className="w-20 border border-gray-300 rounded px-2 py-1 text-sm text-gray-900"
                        min="0"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        value={item.minStock}
                        onChange={(e) => updateCardboard(item.id, { minStock: parseInt(e.target.value) })}
                        className="w-20 border border-gray-300 rounded px-2 py-1 text-sm text-gray-900"
                        min="0"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        step="0.1"
                        value={item.price}
                        onChange={(e) => updateCardboard(item.id, { price: parseFloat(e.target.value) })}
                        className="w-24 border border-gray-300 rounded px-2 py-1 text-sm text-gray-900"
                        min="0"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                        {status.text}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateCardboard(item.id, { stock: item.stock + 10 })}
                          className="text-blue-600 hover:text-blue-900"
                          title="Dodaj 10 szt."
                        >
                          +10
                        </button>
                        <button
                          onClick={() => updateCardboard(item.id, { stock: Math.max(0, item.stock - 1) })}
                          className="text-orange-600 hover:text-orange-900"
                          title="Usuń 1 szt."
                        >
                          -1
                        </button>
                        <button
                          onClick={() => deleteCardboard(item.id, item)}
                          className="text-red-600 hover:text-red-900 font-bold"
                          title="Usuń ten rozmiar kartonu"
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-medium text-blue-900 mb-2">💡 Wskazówki Magazynowe</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Min. Zapas:</strong> Ustaw minimalne poziomy, aby otrzymywać ostrzeżenia o niskim stanie</li>
          <li>• <strong>Aktualizacje Stanu:</strong> Zmiany są zapisywane automatycznie po modyfikacji wartości</li>
          <li>• <strong>Szybkie Akcje:</strong> Użyj przycisków +10/-1 do szybkich korekt stanu magazynowego</li>
          <li>• <strong>Kolory Statusów:</strong> Czerwony = Brak w magazynie, Żółty = Niski stan, Zielony = W magazynie</li>
          <li>• <strong>Usuwanie:</strong> Kliknij ✕ aby usunąć niepotrzebne rozmiary kartonów</li>
        </ul>
      </div>

      {/* Modal dodawania nowego kartonu */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Dodaj nowy rozmiar kartonu</h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Szerokość (cm)
                  </label>
                  <input
                    type="number"
                    value={newCardboard.width}
                    onChange={(e) => setNewCardboard({...newCardboard, width: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    placeholder="np. 120"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Wysokość (cm)
                  </label>
                  <input
                    type="number"
                    value={newCardboard.height}
                    onChange={(e) => setNewCardboard({...newCardboard, height: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    placeholder="np. 80"
                    min="1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stan początkowy
                  </label>
                  <input
                    type="number"
                    value={newCardboard.stock}
                    onChange={(e) => setNewCardboard({...newCardboard, stock: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min. zapas
                  </label>
                  <input
                    type="number"
                    value={newCardboard.minStock}
                    onChange={(e) => setNewCardboard({...newCardboard, minStock: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cena (PLN)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={newCardboard.price}
                    onChange={(e) => setNewCardboard({...newCardboard, price: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    min="0"
                  />
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-sm text-gray-600">
                  <strong>Podgląd:</strong> Karton {newCardboard.width || '?'}×{newCardboard.height || '?'} cm za {newCardboard.price || '?'} PLN
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setNewCardboard({
                    width: '',
                    height: '',
                    stock: '0',
                    minStock: '10',
                    price: '1.0'
                  })
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Anuluj
              </button>
              <button
                onClick={addCardboard}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Dodaj karton
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}