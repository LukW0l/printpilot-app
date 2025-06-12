'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { formStyles } from '@/styles/form-styles'

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
        
        // Show success details
        const { supplierOrder, estimatedPrice } = data.data
        toast.success(
          `Zamówienie utworzone!\n` +
          `Koszt: ${estimatedPrice.total.toFixed(2)} PLN\n` +
          `Nr: ${supplierOrder.orderNumber}`
        )
        
        // Redirect to supplier orders
        router.push('/dashboard/suppliers')
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
      
      <form onSubmit={handleSubmit} className={`${formStyles.spacing.sections} ${formStyles.container}`}>
        <div>
          <h2 className={formStyles.sectionTitle}>Wymiary krosna</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={formStyles.label}>
                Szerokość (cm) *
              </label>
              <input
                type="number"
                min="10"
                max="200"
                value={formData.width}
                onChange={(e) => setFormData({...formData, width: e.target.value})}
                className={formStyles.input}
                placeholder="np. 64"
                required
              />
            </div>
            
            <div>
              <label className={formStyles.label}>
                Wysokość (cm) *
              </label>
              <input
                type="number"
                min="10"
                max="200"
                value={formData.height}
                onChange={(e) => setFormData({...formData, height: e.target.value})}
                className={formStyles.input}
                placeholder="np. 53"
                required
              />
            </div>
          </div>
        </div>

        <div>
          <label className={formStyles.label}>
            Ilość (szt.) *
          </label>
          <input
            type="number"
            min="1"
            max="100"
            value={formData.quantity}
            onChange={(e) => setFormData({...formData, quantity: e.target.value})}
            className={formStyles.input}
            required
          />
        </div>

        <div>
          <label className={formStyles.label}>
            Uwagi (opcjonalne)
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({...formData, notes: e.target.value})}
            className={formStyles.textarea}
            rows={3}
            placeholder="Dodatkowe informacje o zamówieniu..."
          />
        </div>

        <div className={formStyles.container}>
          <h3 className={formStyles.sectionTitle}>Podsumowanie</h3>
          {formData.width && formData.height && (
            <p className="text-black">
              Krosno: <strong>{formData.width}cm x {formData.height}cm</strong><br/>
              Ilość: <strong>{formData.quantity || 1} szt.</strong>
            </p>
          )}
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className={`flex-1 ${formStyles.primaryButton}`}
          >
            {loading ? 'Tworzenie...' : 'Utwórz zamówienie'}
          </button>
          
          <button
            type="button"
            onClick={() => router.back()}
            className={`px-6 py-2 ${formStyles.secondaryButton}`}
          >
            Anuluj
          </button>
        </div>
      </form>

      <div className={`mt-6 ${formStyles.container}`}>
        <h3 className={formStyles.sectionTitle}>ℹ️ Informacja</h3>
        <p className={formStyles.helpText}>
          To zamówienie zostanie utworzone jako zamówienie u dostawcy (Tempich) 
          z automatycznym wyliczeniem kosztów na podstawie wymiarów.
        </p>
      </div>
    </div>
  )
}