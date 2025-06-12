'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { 
  BuildingOfficeIcon,
  PhoneIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  PlusIcon,
  StarIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import { formStyles } from '@/styles/form-styles'

interface Supplier {
  id: string
  name: string
  contactPerson?: string
  email: string
  phone?: string
  website?: string
  address: string
  city: string
  postalCode: string
  country: string
  category: string
  paymentTerms?: string
  deliveryTime?: number
  minimumOrderValue?: number
  rating: number
  reliability: number
  qualityRating: number
  isActive: boolean
  isPreferred: boolean
  thinStripPricePerMeter?: number
  thickStripPricePerMeter?: number
  crossbarPricePerMeter?: number
  materialMargin?: number
}

interface SupplierStats {
  totalSuppliers: number
  activeSuppliers: number
  preferredSuppliers: number
  categoryBreakdown: Record<string, number>
  averageRating: number
  averageReliability: number
  totalOrders: number
  totalOrderValue: number
  onTimeDeliveryRate: number
  topSuppliers: Array<{
    id: string
    name: string
    orderCount: number
    totalValue: number
    averageRating: number
    onTimeRate: number
  }>
}

const categoryLabels = {
  FRAMES: 'Krosna i ramy',
  PRINTING: 'Usługi drukarskie',
  PACKAGING: 'Opakowania',
  MATERIALS: 'Materiały',
  SHIPPING: 'Kurierzy',
  OTHER: 'Inne'
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [stats, setStats] = useState<SupplierStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')

  useEffect(() => {
    fetchSuppliers()
    fetchStats()
  }, [])

  const fetchSuppliers = async () => {
    try {
      const response = await fetch('/api/suppliers?action=list')
      const data = await response.json()
      if (data.success) {
        setSuppliers(data.data)
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error)
      toast.error('Nie udało się pobrać listy dostawców')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/suppliers?action=stats')
      const data = await response.json()
      if (data.success) {
        setStats(data.data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const filteredSuppliers = selectedCategory === 'ALL' 
    ? suppliers 
    : suppliers.filter(s => s.category === selectedCategory)

  const renderStarRating = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <StarIcon
            key={star}
            className={`h-4 w-4 ${star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
          />
        ))}
        <span className="ml-1 text-sm text-gray-600">({rating.toFixed(1)})</span>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Ładowanie dostawców...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 -mx-6 -mt-6 px-6 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <BuildingOfficeIcon className="h-8 w-8 text-gray-600 mr-3" />
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 sm:text-3xl">Zarządzanie dostawcami</h1>
              <p className="text-sm text-gray-600 mt-1">Monitoruj i zarządzaj swoimi dostawcami</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Dodaj dostawcę
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BuildingOfficeIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Wszyscy dostawcy</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalSuppliers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Aktywni</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.activeSuppliers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <StarIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Średnia ocena</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.averageRating.toFixed(1)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <CheckCircleIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Punktualność</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.onTimeDeliveryRate.toFixed(0)}%</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedCategory === 'ALL'
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Wszystkie ({suppliers.length})
          </button>
          {Object.entries(categoryLabels).map(([key, label]) => {
            const count = suppliers.filter(s => s.category === key).length
            if (count === 0) return null
            
            return (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === key
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {label} ({count})
              </button>
            )
          })}
        </div>
      </div>

      {/* Suppliers List */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Lista dostawców ({filteredSuppliers.length})
          </h2>
        </div>

        {filteredSuppliers.length === 0 ? (
          <div className="p-12 text-center">
            <BuildingOfficeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Brak dostawców</h3>
            <p className="text-gray-600 mb-6">
              {selectedCategory === 'ALL' 
                ? 'Nie masz jeszcze żadnych dostawców. Dodaj pierwszego dostawcę aby rozpocząć.'
                : `Brak dostawców w kategorii ${categoryLabels[selectedCategory as keyof typeof categoryLabels]}`
              }
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Dodaj dostawcę
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredSuppliers.map((supplier) => (
              <div key={supplier.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h3 className="text-lg font-semibold text-gray-900">{supplier.name}</h3>
                      {supplier.isPreferred && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          ⭐ Preferowany
                        </span>
                      )}
                      {!supplier.isActive && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Nieaktywny
                        </span>
                      )}
                    </div>
                    
                    <div className="mt-2 flex items-center text-sm text-gray-600">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {categoryLabels[supplier.category as keyof typeof categoryLabels]}
                      </span>
                      {supplier.contactPerson && (
                        <span className="ml-4">Kontakt: {supplier.contactPerson}</span>
                      )}
                    </div>

                    <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <EnvelopeIcon className="h-4 w-4 mr-2" />
                        {supplier.email}
                      </div>
                      {supplier.phone && (
                        <div className="flex items-center text-sm text-gray-600">
                          <PhoneIcon className="h-4 w-4 mr-2" />
                          {supplier.phone}
                        </div>
                      )}
                      {supplier.website && (
                        <div className="flex items-center text-sm text-gray-600">
                          <GlobeAltIcon className="h-4 w-4 mr-2" />
                          <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                            Strona www
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex items-center space-x-6">
                      <div>
                        <span className="text-xs text-gray-500">Ocena ogólna:</span>
                        {renderStarRating(supplier.rating)}
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Niezawodność:</span>
                        {renderStarRating(supplier.reliability)}
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Jakość:</span>
                        {renderStarRating(supplier.qualityRating)}
                      </div>
                    </div>

                    <div className="mt-2 text-sm text-gray-600">
                      <span className="font-medium">Adres:</span> {supplier.address}, {supplier.city} {supplier.postalCode}, {supplier.country}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => setEditingSupplier(supplier)}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm(`Czy na pewno chcesz usunąć dostawcę "${supplier.name}"? Ta operacja jest nieodwracalna.`)) {
                          try {
                            const response = await fetch(`/api/suppliers?id=${supplier.id}&type=supplier`, {
                              method: 'DELETE'
                            })
                            
                            const data = await response.json()
                            
                            if (data.success) {
                              toast.success('Dostawca został usunięty')
                              fetchSuppliers() // Refresh the list
                            } else {
                              toast.error(data.error || 'Nie udało się usunąć dostawcy')
                            }
                          } catch (error) {
                            console.error('Error deleting supplier:', error)
                            toast.error('Błąd podczas usuwania dostawcy')
                          }
                        }
                      }}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Form Modal */}
      {(showAddForm || editingSupplier) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                {editingSupplier ? 'Edytuj dostawcę' : 'Dodaj nowego dostawcę'}
              </h2>
              
              <form id="supplier-form" onSubmit={async (e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                const newSupplier = {
                  name: formData.get('name') as string,
                  contactPerson: formData.get('contactPerson') as string || undefined,
                  email: formData.get('email') as string,
                  phone: formData.get('phone') as string || undefined,
                  website: formData.get('website') as string || undefined,
                  address: formData.get('address') as string,
                  city: formData.get('city') as string,
                  postalCode: formData.get('postalCode') as string,
                  country: formData.get('country') as string,
                  category: formData.get('category') as string,
                  paymentTerms: formData.get('paymentTerms') as string || undefined,
                  deliveryTime: formData.get('deliveryTime') ? parseInt(formData.get('deliveryTime') as string) : undefined,
                  minimumOrderValue: formData.get('minimumOrderValue') ? parseFloat(formData.get('minimumOrderValue') as string) : undefined,
                  rating: parseFloat(formData.get('rating') as string),
                  reliability: parseFloat(formData.get('reliability') as string),
                  qualityRating: parseFloat(formData.get('qualityRating') as string),
                  isActive: formData.get('isActive') === 'on',
                  isPreferred: formData.get('isPreferred') === 'on',
                  thinStripPricePerMeter: formData.get('thinStripPricePerMeter') ? parseFloat(formData.get('thinStripPricePerMeter') as string) : undefined,
                  thickStripPricePerMeter: formData.get('thickStripPricePerMeter') ? parseFloat(formData.get('thickStripPricePerMeter') as string) : undefined,
                  crossbarPricePerMeter: formData.get('crossbarPricePerMeter') ? parseFloat(formData.get('crossbarPricePerMeter') as string) : undefined,
                  materialMargin: formData.get('materialMargin') ? parseFloat(formData.get('materialMargin') as string) : undefined
                }
                
                // Call API to save the supplier
                try {
                  const response = await fetch('/api/suppliers', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      action: editingSupplier ? 'update' : 'create',
                      id: editingSupplier?.id,
                      ...newSupplier
                    })
                  })
                  
                  const data = await response.json()
                  
                  if (data.success) {
                    toast.success(editingSupplier ? 'Dostawca zaktualizowany' : 'Dostawca dodany')
                    setShowAddForm(false)
                    setEditingSupplier(null)
                    fetchSuppliers() // Refresh the list
                  } else {
                    toast.error(data.error || 'Błąd podczas zapisywania dostawcy')
                  }
                } catch (error) {
                  console.error('Error saving supplier:', error)
                  toast.error('Błąd podczas zapisywania dostawcy')
                }
              }} className="space-y-4">
                
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={formStyles.label}>
                      Nazwa dostawcy *
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      defaultValue={editingSupplier?.name || ''}
                      className={formStyles.input}
                      placeholder="np. Drukarnia XYZ"
                    />
                  </div>
                  
                  <div>
                    <label className={formStyles.label}>
                      Osoba kontaktowa
                    </label>
                    <input
                      type="text"
                      name="contactPerson"
                      defaultValue={editingSupplier?.contactPerson || ''}
                      className={formStyles.input}
                      placeholder="Jan Kowalski"
                    />
                  </div>
                </div>

                {/* Contact Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={formStyles.label}>
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      defaultValue={editingSupplier?.email || ''}
                      className={formStyles.input}
                      placeholder="kontakt@dostawca.pl"
                    />
                  </div>
                  
                  <div>
                    <label className={formStyles.label}>
                      Telefon
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      defaultValue={editingSupplier?.phone || ''}
                      className={formStyles.input}
                      placeholder="+48 123 456 789"
                    />
                  </div>
                </div>

                <div>
                  <label className={formStyles.label}>
                    Strona internetowa
                  </label>
                  <input
                    type="url"
                    name="website"
                    defaultValue={editingSupplier?.website || ''}
                    className={formStyles.input}
                    placeholder="https://www.dostawca.pl"
                  />
                </div>

                {/* Address */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-900">Adres</h3>
                  
                  <div>
                    <label className={formStyles.label}>
                      Adres *
                    </label>
                    <input
                      type="text"
                      name="address"
                      required
                      defaultValue={editingSupplier?.address || ''}
                      className={formStyles.input}
                      placeholder="ul. Przykładowa 123"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className={formStyles.label}>
                        Miasto *
                      </label>
                      <input
                        type="text"
                        name="city"
                        required
                        defaultValue={editingSupplier?.city || ''}
                        className={formStyles.input}
                        placeholder="Warszawa"
                      />
                    </div>
                    
                    <div>
                      <label className={formStyles.label}>
                        Kod pocztowy *
                      </label>
                      <input
                        type="text"
                        name="postalCode"
                        required
                        defaultValue={editingSupplier?.postalCode || ''}
                        className={formStyles.input}
                        placeholder="00-000"
                      />
                    </div>
                    
                    <div>
                      <label className={formStyles.label}>
                        Kraj *
                      </label>
                      <select
                        name="country"
                        required
                        defaultValue={editingSupplier?.country || 'PL'}
                        className={formStyles.select}
                      >
                        <option value="PL">Polska</option>
                        <option value="DE">Niemcy</option>
                        <option value="CZ">Czechy</option>
                        <option value="SK">Słowacja</option>
                        <option value="LT">Litwa</option>
                        <option value="UA">Ukraina</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Business Details */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-900">Szczegóły współpracy</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={formStyles.label}>
                        Kategoria *
                      </label>
                      <select
                        name="category"
                        required
                        defaultValue={editingSupplier?.category || 'OTHER'}
                        className={formStyles.select}
                      >
                        {Object.entries(categoryLabels).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className={formStyles.label}>
                        Warunki płatności
                      </label>
                      <input
                        type="text"
                        name="paymentTerms"
                        defaultValue={editingSupplier?.paymentTerms || ''}
                        className={formStyles.input}
                        placeholder="np. 14 dni, za pobraniem"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={formStyles.label}>
                        Czas dostawy (dni)
                      </label>
                      <input
                        type="number"
                        name="deliveryTime"
                        min="1"
                        max="365"
                        defaultValue={editingSupplier?.deliveryTime || ''}
                        className={formStyles.input}
                        placeholder="7"
                      />
                    </div>
                    
                    <div>
                      <label className={formStyles.label}>
                        Minimalna wartość zamówienia (PLN)
                      </label>
                      <input
                        type="number"
                        name="minimumOrderValue"
                        min="0"
                        step="0.01"
                        defaultValue={editingSupplier?.minimumOrderValue || ''}
                        className={formStyles.input}
                        placeholder="100.00"
                      />
                    </div>
                  </div>
                </div>

                {/* Ratings */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-900">Ocena</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className={formStyles.label}>
                        Ocena ogólna (0-5)
                      </label>
                      <input
                        type="number"
                        name="rating"
                        min="0"
                        max="5"
                        step="0.1"
                        defaultValue={editingSupplier?.rating || '5'}
                        className={formStyles.input}
                      />
                    </div>
                    
                    <div>
                      <label className={formStyles.label}>
                        Niezawodność (0-5)
                      </label>
                      <input
                        type="number"
                        name="reliability"
                        min="0"
                        max="5"
                        step="0.1"
                        defaultValue={editingSupplier?.reliability || '5'}
                        className={formStyles.input}
                      />
                    </div>
                    
                    <div>
                      <label className={formStyles.label}>
                        Jakość (0-5)
                      </label>
                      <input
                        type="number"
                        name="qualityRating"
                        min="0"
                        max="5"
                        step="0.1"
                        defaultValue={editingSupplier?.qualityRating || '5'}
                        className={formStyles.input}
                      />
                    </div>
                  </div>
                </div>

                {/* Frame Material Pricing - tylko dla dostawców krosien */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-900">
                    Ceny materiałów ramowych (tylko dla kategorii FRAMES)
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={formStyles.label}>
                        Listwa cienka (PLN/mb)
                      </label>
                      <input
                        type="number"
                        name="thinStripPricePerMeter"
                        step="0.01"
                        min="0"
                        placeholder="np. 2.50"
                        defaultValue={editingSupplier?.thinStripPricePerMeter || ''}
                        className={formStyles.input}
                      />
                    </div>
                    
                    <div>
                      <label className={formStyles.label}>
                        Listwa gruba (PLN/mb)
                      </label>
                      <input
                        type="number"
                        name="thickStripPricePerMeter"
                        step="0.01"
                        min="0"
                        placeholder="np. 3.20"
                        defaultValue={editingSupplier?.thickStripPricePerMeter || ''}
                        className={formStyles.input}
                      />
                    </div>
                    
                    <div>
                      <label className={formStyles.label}>
                        Poprzeczka (PLN/mb)
                      </label>
                      <input
                        type="number"
                        name="crossbarPricePerMeter"
                        step="0.01"
                        min="0"
                        placeholder="np. 1.80"
                        defaultValue={editingSupplier?.crossbarPricePerMeter || ''}
                        className={formStyles.input}
                      />
                    </div>
                    
                    <div>
                      <label className={formStyles.label}>
                        Marża dostawcy (%)
                      </label>
                      <input
                        type="number"
                        name="materialMargin"
                        step="0.1"
                        min="0"
                        max="100"
                        placeholder="np. 15"
                        defaultValue={editingSupplier?.materialMargin || ''}
                        className={formStyles.input}
                      />
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    💡 Po ustawieniu cen zostanie automatycznie wygenerowana lista produktów na podstawie dostępnych długości z magazynu.
                  </div>
                </div>

                {/* Status Options */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-900">Status</h3>
                  
                  <div className="flex items-center space-x-6">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="isActive"
                        defaultChecked={editingSupplier?.isActive !== false}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Aktywny</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="isPreferred"
                        defaultChecked={editingSupplier?.isPreferred || false}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Preferowany</span>
                    </label>
                  </div>
                </div>

              </form>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false)
                    setEditingSupplier(null)
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  form="supplier-form"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingSupplier ? 'Zaktualizuj' : 'Zapisz'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}