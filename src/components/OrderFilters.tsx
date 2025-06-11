'use client'

import { useState, useEffect } from 'react'
import { CalendarDaysIcon } from '@heroicons/react/24/outline'

interface OrderFiltersProps {
  onFilterChange: (filters: any) => void
  shops: { id: string; name: string }[]
  dateRange?: {
    isDefault: boolean
    days: number | null
    filtered: number
    totalAllTime: number
  }
}

const quickTimeFilters = [
  { label: 'Dziś', days: 1, key: 'today' },
  { label: '7 dni', days: 7, key: '7d' },
  { label: '30 dni', days: 30, key: '30d' },
  { label: '3 miesiące', days: 90, key: '3m' },
  { label: 'Wszystkie', days: null, key: 'all' }
]

export default function OrderFilters({ onFilterChange, shops, dateRange }: OrderFiltersProps) {
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    shopId: '',
    dateFrom: '',
    dateTo: '',
    days: '30', // Default to 30 days
    all: ''
  })
  
  const [selectedQuickFilter, setSelectedQuickFilter] = useState('30d')

  // Set default filter on component mount
  useEffect(() => {
    onFilterChange(filters)
  }, []) // Only run on mount

  const handleChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const handleQuickTimeFilter = (filterKey: string, days: number | null) => {
    setSelectedQuickFilter(filterKey)
    
    let newFilters = { ...filters }
    
    if (days === null) {
      // Show all
      newFilters = { ...newFilters, days: '', dateFrom: '', dateTo: '', all: 'true' }
    } else {
      // Quick filter
      newFilters = { ...newFilters, days: days.toString(), dateFrom: '', dateTo: '', all: '' }
    }
    
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const clearFilters = () => {
    const clearedFilters = {
      search: '',
      status: '',
      shopId: '',
      dateFrom: '',
      dateTo: '',
      days: '30', // Reset to default
      all: ''
    }
    setFilters(clearedFilters)
    setSelectedQuickFilter('30d')
    onFilterChange(clearedFilters)
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
      {/* Quick Time Filters */}
      <div>
        <div className="flex items-center mb-4">
          <CalendarDaysIcon className="h-5 w-5 text-indigo-500 mr-2" />
          <span className="text-sm font-semibold text-gray-800">Okres czasu:</span>
          {dateRange && (
            <span className="ml-2 text-xs font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded-full">
              {dateRange.filtered} z {dateRange.totalAllTime} zamówień
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {quickTimeFilters.map((filter) => (
            <button
              key={filter.key}
              onClick={() => handleQuickTimeFilter(filter.key, filter.days)}
              className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
                selectedQuickFilter === filter.key
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg transform scale-105'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:shadow-md'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Szukaj
          </label>
          <input
            type="text"
            placeholder="ID zamówienia lub klient..."
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-500 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 hover:border-gray-400 shadow-sm"
            value={filters.search}
            onChange={(e) => handleChange('search', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Status
          </label>
          <select
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 hover:border-gray-400 shadow-sm"
            value={filters.status}
            onChange={(e) => handleChange('status', e.target.value)}
          >
            <option value="">Wszystkie statusy</option>
            <option value="NEW">Nowe</option>
            <option value="PROCESSING">W realizacji</option>
            <option value="PRINTED">Wydrukowane</option>
            <option value="SHIPPED">Wysłane</option>
            <option value="DELIVERED">Dostarczone</option>
            <option value="CANCELLED">Anulowane</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Sklep
          </label>
          <select
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 hover:border-gray-400 shadow-sm"
            value={filters.shopId}
            onChange={(e) => handleChange('shopId', e.target.value)}
          >
            <option value="">Wszystkie sklepy</option>
            {shops.map(shop => (
              <option key={shop.id} value={shop.id}>{shop.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Data od
          </label>
          <input
            type="date"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 hover:border-gray-400 shadow-sm"
            value={filters.dateFrom}
            onChange={(e) => handleChange('dateFrom', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Data do
          </label>
          <input
            type="date"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 hover:border-gray-400 shadow-sm"
            value={filters.dateTo}
            onChange={(e) => handleChange('dateTo', e.target.value)}
          />
        </div>
      </div>

      {Object.values(filters).some(v => v) && (
        <div className="flex justify-end pt-4 border-t border-gray-100">
          <button
            onClick={clearFilters}
            className="text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors duration-200 px-4 py-2 rounded-lg hover:bg-gray-50"
          >
            Wyczyść filtry
          </button>
        </div>
      )}
    </div>
  )
}