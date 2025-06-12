'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function CustomFrameOrderPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    width: '',
    height: '',
    quantity: '1',
    notes: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.width || !formData.height || !formData.quantity) {
      toast.error('Wypełnij wszystkie wymagane pola')
      return
    }

    setLoading(true)
    
    try {
      const response = await fetch('/api/frame-orders/custom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          width: parseInt(formData.width),
          height: parseInt(formData.height),
          quantity: parseInt(formData.quantity),
          notes: formData.notes
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Zamówienie krosna utworzone!')
        
        if (data.data.supplierOrder) {
          // Redirect to supplier order
          router.push(`/dashboard/frame-orders`)
        } else {
          router.push('/dashboard/frames')
        }
      } else {
        toast.error(data.error || 'Błąd tworzenia zamówienia')
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Błąd połączenia z serwerem')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Niestandardowe zamówienie krosna</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-lg shadow p-6">
        <div>
          <h2 className="text-lg font-semibold mb-4">Wymiary krosna</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Szerokość (cm) *
              </label>
              <input
                type="number"
                min="10"
                max="200"
                value={formData.width}
                onChange={(e) => setFormData({...formData, width: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="np. 64"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Wysokość (cm) *
              </label>
              <input
                type="number"
                min="10"
                max="200"
                value={formData.height}
                onChange={(e) => setFormData({...formData, height: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="np. 53"
                required
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ilość (szt.) *
          </label>
          <input
            type="number"
            min="1"
            max="100"
            value={formData.quantity}
            onChange={(e) => setFormData({...formData, quantity: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Uwagi (opcjonalne)
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({...formData, notes: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Dodatkowe informacje o zamówieniu..."
          />
        </div>

        <div className="bg-blue-50 p-4 rounded-md">
          <h3 className="font-medium text-blue-900 mb-2">Podsumowanie:</h3>
          {formData.width && formData.height && (
            <p className="text-blue-700">
              Krosno: <strong>{formData.width}cm x {formData.height}cm</strong><br/>
              Ilość: <strong>{formData.quantity || 1} szt.</strong>
            </p>
          )}
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Tworzenie...' : 'Utwórz zamówienie'}
          </button>
          
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Anuluj
          </button>
        </div>
      </form>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium text-gray-900 mb-2">ℹ️ Informacja</h3>
        <p className="text-sm text-gray-600">
          To zamówienie zostanie automatycznie dodane do systemu Frame Requirements 
          oraz utworzone jako zamówienie u dostawcy (Tempich).
        </p>
      </div>
    </div>
  )
}