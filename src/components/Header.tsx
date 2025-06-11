'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { MagnifyingGlassIcon, UserCircleIcon } from '@heroicons/react/24/outline'
import NotificationCenter from './NotificationCenter'

export default function Header() {
  const [searchQuery, setSearchQuery] = useState('')
  const router = useRouter()
  const pathname = usePathname()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      // If we're already on orders page, we'll use URL params
      if (pathname === '/dashboard/orders') {
        const params = new URLSearchParams(window.location.search)
        params.set('search', searchQuery.trim())
        router.push(`/dashboard/orders?${params.toString()}`)
      } else {
        // Navigate to orders page with search query
        router.push(`/dashboard/orders?search=${encodeURIComponent(searchQuery.trim())}`)
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(e as any)
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between h-16 px-6">
        {/* Left side - Global Search */}
        <div className="flex items-center flex-1 max-w-lg">
          <form onSubmit={handleSearch} className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-600" />
            </div>
            <input
              type="text"
              placeholder="Szukaj zamówień, klientów, ID zamówienia..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="block w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-600 focus:outline-none focus:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
            {searchQuery && (
              <div className="absolute inset-y-0 right-0 flex items-center">
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-2 text-gray-600 hover:text-gray-800"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <button
                  type="submit"
                  className="p-2 text-blue-600 hover:text-blue-800"
                >
                  <MagnifyingGlassIcon className="h-4 w-4" />
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center space-x-4">
          {/* Quick actions */}
          <div className="hidden md:flex items-center space-x-2">
            <button className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors">
              + Nowe zamówienie
            </button>
          </div>

          {/* Smart Notifications */}
          <NotificationCenter />

          {/* User menu */}
          <div className="relative">
            <button className="flex items-center p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <div className="flex items-center space-x-3">
                <div className="hidden md:block text-right">
                  <div className="text-sm font-medium">Użytkownik Admin</div>
                  <div className="text-xs text-gray-500">Administrator</div>
                </div>
                <UserCircleIcon className="h-8 w-8 text-gray-600" />
              </div>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}