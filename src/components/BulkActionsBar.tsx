'use client'

import { useState } from 'react'
import { 
  CheckIcon,
  XMarkIcon,
  TrashIcon,
  DocumentArrowDownIcon,
  ClockIcon,
  CogIcon,
  TruckIcon,
  UserIcon,
  TagIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface BulkActionsBarProps {
  selectedItems: string[]
  onClearSelection: () => void
  onBulkAction: (action: string, data?: any) => void
  totalItems: number
}

export default function BulkActionsBar({ 
  selectedItems, 
  onClearSelection, 
  onBulkAction,
  totalItems 
}: BulkActionsBarProps) {
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [showAssignMenu, setShowAssignMenu] = useState(false)

  if (selectedItems.length === 0) return null

  const statusOptions = [
    { value: 'NEW', label: 'Nowe', icon: ClockIcon, color: 'text-blue-600' },
    { value: 'PROCESSING', label: 'W realizacji', icon: CogIcon, color: 'text-amber-600' },
    { value: 'PRINTED', label: 'Wydrukowane', icon: CheckIcon, color: 'text-purple-600' },
    { value: 'SHIPPED', label: 'Wysłane', icon: TruckIcon, color: 'text-green-600' },
    { value: 'CANCELLED', label: 'Anulowane', icon: XMarkIcon, color: 'text-red-600' }
  ]

  const operators = [
    { id: 'user1', name: 'Jan Kowalski', avatar: 'JK' },
    { id: 'user2', name: 'Anna Nowak', avatar: 'AN' },
    { id: 'user3', name: 'Piotr Wiśniewski', avatar: 'PW' }
  ]

  const handleBulkStatusUpdate = (status: string) => {
    onBulkAction('updateStatus', { status })
    setShowStatusMenu(false)
    toast.success(`Zaktualizowano status dla ${selectedItems.length} zamówień`)
  }

  const handleBulkAssignment = (operatorId: string, operatorName: string) => {
    onBulkAction('assignOperator', { operatorId, operatorName })
    setShowAssignMenu(false)
    toast.success(`Przypisano ${selectedItems.length} zamówień do ${operatorName}`)
  }

  const handleBulkExport = () => {
    onBulkAction('export')
    toast.success(`Eksportowanie ${selectedItems.length} zamówień...`)
  }

  const handleBulkDelete = () => {
    if (confirm(`Czy na pewno chcesz usunąć ${selectedItems.length} zamówień?`)) {
      onBulkAction('delete')
      toast.success(`Usunięto ${selectedItems.length} zamówień`)
    }
  }

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 px-6 py-4 flex items-center space-x-4 min-w-max backdrop-blur-sm bg-white/95">
        {/* Selection Info */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
            <CheckIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">
              {selectedItems.length} wybranych
            </p>
            <p className="text-xs text-gray-600 font-medium">
              z {totalItems} zamówień
            </p>
          </div>
        </div>

        <div className="h-8 w-px bg-gray-200"></div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          {/* Update Status */}
          <div className="relative">
            <button
              onClick={() => setShowStatusMenu(!showStatusMenu)}
              className="inline-flex items-center px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
            >
              <TagIcon className="w-4 h-4 mr-2" />
              Zmień status
            </button>
            
            {showStatusMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowStatusMenu(false)} />
                <div className="absolute bottom-full left-0 mb-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                  {statusOptions.map((status) => (
                    <button
                      key={status.value}
                      onClick={() => handleBulkStatusUpdate(status.value)}
                      className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <status.icon className={`w-4 h-4 mr-3 ${status.color}`} />
                      {status.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Assign Operator */}
          <div className="relative">
            <button
              onClick={() => setShowAssignMenu(!showAssignMenu)}
              className="inline-flex items-center px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
            >
              <UserIcon className="w-4 h-4 mr-2" />
              Przypisz
            </button>
            
            {showAssignMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowAssignMenu(false)} />
                <div className="absolute bottom-full left-0 mb-2 w-52 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                  {operators.map((operator) => (
                    <button
                      key={operator.id}
                      onClick={() => handleBulkAssignment(operator.id, operator.name)}
                      className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium mr-3">
                        {operator.avatar}
                      </div>
                      {operator.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Bulk Ship */}
          <button
            onClick={() => onBulkAction('bulkShip')}
            className="inline-flex items-center px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
          >
            <TruckIcon className="w-4 h-4 mr-2" />
            Zamów kuriera
          </button>

          {/* Export */}
          <button
            onClick={handleBulkExport}
            className="inline-flex items-center px-4 py-2.5 text-sm font-semibold text-gray-700 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
          >
            <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
            Eksportuj
          </button>

          {/* Delete */}
          <button
            onClick={handleBulkDelete}
            className="inline-flex items-center px-4 py-2.5 text-sm font-semibold text-red-700 bg-gradient-to-r from-red-100 to-red-200 hover:from-red-200 hover:to-red-300 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
          >
            <TrashIcon className="w-4 h-4 mr-2" />
            Usuń
          </button>
        </div>

        <div className="h-8 w-px bg-gray-200"></div>

        {/* Close */}
        <button
          onClick={onClearSelection}
          className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200 hover:shadow-sm"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}