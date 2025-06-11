'use client'

import { useState } from 'react'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

interface ExportButtonProps {
  filters?: any
}

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
  }
}

export default function ExportButton({ filters = {} }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false)

  const exportToCSV = async () => {
    setExporting(true)
    try {
      const params = new URLSearchParams()
      params.append('format', 'csv')
      if (filters.status) params.append('status', filters.status)
      if (filters.shopId) params.append('shopId', filters.shopId)
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.append('dateTo', filters.dateTo)

      const response = await fetch(`/api/orders/export?${params}`)
      const blob = await response.blob()
      
      // Download file
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export error:', error)
    } finally {
      setExporting(false)
    }
  }

  const exportToPDF = async () => {
    setExporting(true)
    try {
      const params = new URLSearchParams()
      params.append('format', 'json')
      if (filters.status) params.append('status', filters.status)
      if (filters.shopId) params.append('shopId', filters.shopId)
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.append('dateTo', filters.dateTo)

      const response = await fetch(`/api/orders/export?${params}`)
      const orders = await response.json()

      // Create PDF
      const doc = new jsPDF()
      
      // Title
      doc.setFontSize(20)
      doc.text('Raport zamówień PrintPilot', 14, 22)
      
      // Date
      doc.setFontSize(10)
      doc.text(`Wygenerowany: ${new Date().toLocaleString('pl-PL')}`, 14, 30)
      
      // Table data
      const tableData = orders.map((order: any) => [
        order.externalId,
        order.shop.name,
        order.customerName,
        order.status,
        `${Number(order.totalAmount).toFixed(2)} ${order.currency}`,
        new Date(order.orderDate).toLocaleDateString()
      ])

      // Add table
      doc.autoTable({
        head: [['ID zamówienia', 'Sklep', 'Klient', 'Status', 'Suma', 'Data']],
        body: tableData,
        startY: 40,
        theme: 'striped',
        styles: { fontSize: 8 }
      })

      // Save PDF
      doc.save(`orders-${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (error) {
      console.error('Export error:', error)
    } finally {
      setExporting(false)
    }
  }

  const [showDropdown, setShowDropdown] = useState(false)

  return (
    <div className="relative inline-block text-left">
      <div>
        <button
          type="button"
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          disabled={exporting}
          onClick={() => setShowDropdown(!showDropdown)}
        >
          <svg className="mr-2 -ml-1 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {exporting ? 'Eksportowanie...' : 'Eksportuj'}
          <svg className="ml-2 -mr-1 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {showDropdown && (
        <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1">
            <button
              onClick={() => {
                exportToCSV()
                setShowDropdown(false)
              }}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              disabled={exporting}
            >
              Eksportuj jako CSV
            </button>
            <button
              onClick={() => {
                exportToPDF()
                setShowDropdown(false)
              }}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              disabled={exporting}
            >
              Eksportuj jako PDF
            </button>
          </div>
        </div>
      )}
    </div>
  )
}