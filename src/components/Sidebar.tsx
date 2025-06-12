'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { 
  HomeIcon, 
  ShoppingBagIcon, 
  PrinterIcon,
  TruckIcon,
  ChartBarIcon,
  BuildingStorefrontIcon,
  Squares2X2Icon,
  CubeIcon,
  WrenchScrewdriverIcon,
  UserCircleIcon,
  CalculatorIcon,
  Cog6ToothIcon,
  QuestionMarkCircleIcon,
  ChevronUpIcon,
  PlusCircleIcon,
  ChevronDownIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ChartPieIcon,
  CalendarDaysIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline'

// Navigation structure inspired by Shopify
const navigationSections = [
  {
    name: 'Pulpit',
    items: [
      { name: 'Przegląd główny', href: '/dashboard', icon: HomeIcon, badge: null },
    ]
  },
  {
    name: 'Zamówienia',
    items: [
      { name: 'Wszystkie zamówienia', href: '/dashboard/orders', icon: ShoppingBagIcon, badge: null },
    ]
  },
  {
    name: 'Produkcja',
    items: [
      { name: 'Kolejka produkcji', href: '/dashboard/production', icon: PrinterIcon, badge: 'production' },
      { name: 'Warsztat', href: '/dashboard/workshop-simple', icon: WrenchScrewdriverIcon, badge: null },
      { name: 'Timery i planowanie', href: '/dashboard/production/timers', icon: ClockIcon, badge: null },
      { name: 'Przygotowanie ram', href: '/dashboard/frames/preparation-list', icon: Squares2X2Icon, badge: null },
    ]
  },
  {
    name: 'Magazyn',
    items: [
      { name: 'Materiały i zapasy', href: '/dashboard/inventory', icon: CubeIcon, badge: 'low' },
      { name: 'Ramy i komponenty', href: '/dashboard/frames', icon: Squares2X2Icon, badge: null },
      { name: 'Zamów krosno niestandardowe', href: '/dashboard/custom-frame-order', icon: PlusCircleIcon, badge: null },
      { name: 'Monitoring stanu', href: '/dashboard/cardboard-inventory', icon: CubeIcon, badge: null },
    ]
  },
  {
    name: 'Realizacja',
    items: [
      { name: 'Wysyłka i etykiety', href: '/dashboard/shipping', icon: TruckIcon, badge: null },
      { name: 'Kalkulator kosztów', href: '/dashboard/shipping-calculator', icon: CalculatorIcon, badge: null },
    ]
  },
  {
    name: 'Analityka',
    items: [
      { name: 'Dashboard wydajności', href: '/dashboard/analytics', icon: ChartBarIcon, badge: null },
      { name: 'Prognozowanie popytu', href: '/dashboard/analytics/demand-forecast', icon: ChartPieIcon, badge: null },
      { name: 'Analiza rentowności', href: '/dashboard/analytics/profitability', icon: CurrencyDollarIcon, badge: null },
      { name: 'Raporty czasowe', href: '/dashboard/analytics/timeline', icon: CalendarDaysIcon, badge: null },
    ]
  },
  {
    name: 'Dostawcy i zakupy',
    items: [
      { name: 'Zamówienia krosien', href: '/dashboard/frame-orders', icon: Squares2X2Icon, badge: null },
      { name: 'Zarządzanie dostawcami', href: '/dashboard/suppliers', icon: BuildingOfficeIcon, badge: null },
    ]
  },
  {
    name: 'Ustawienia',
    items: [
      { name: 'Podłączone sklepy', href: '/dashboard/shops', icon: BuildingStorefrontIcon, badge: null },
      { name: 'Koszty produkcji', href: '/dashboard/production-costs', icon: CalculatorIcon, badge: null },
      { name: 'Konfiguracja systemu', href: '/dashboard/settings', icon: Cog6ToothIcon, badge: null },
    ]
  }
]

export default function Sidebar({ isCollapsed, onToggle }: { isCollapsed: boolean, onToggle: () => void }) {
  const pathname = usePathname()
  const [collapsedSections, setCollapsedSections] = useState<string[]>([])
  const [productionStats, setProductionStats] = useState({
    notPrinted: 0,
    printing: 0,
    total: 0
  })

  useEffect(() => {
    fetchProductionStats()
    // Refresh every 30 seconds
    const interval = setInterval(fetchProductionStats, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchProductionStats = async () => {
    try {
      const response = await fetch('/api/orders/stats')
      const data = await response.json()
      setProductionStats({
        notPrinted: data.production?.notPrinted || 0,
        printing: data.production?.printing || 0,
        total: (data.production?.notPrinted || 0) + (data.production?.printing || 0)
      })
    } catch (error) {
      console.error('Error fetching production stats:', error)
    }
  }

  const toggleSection = (sectionName: string) => {
    if (isCollapsed) return // Don't toggle sections when sidebar is collapsed
    setCollapsedSections(prev => 
      prev.includes(sectionName) 
        ? prev.filter(name => name !== sectionName)
        : [...prev, sectionName]
    )
  }

  const getBadgeContent = (badge: string | null) => {
    if (!badge) return null
    
    if (badge === 'low') {
      return (
        <div className="ml-auto">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            !
          </span>
        </div>
      )
    }
    
    if (badge === 'production') {
      const count = productionStats.total
      if (count === 0) return null
      
      return (
        <div className="ml-auto">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            {count}
          </span>
        </div>
      )
    }
    
    return (
      <div className="ml-auto">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {badge}
        </span>
      </div>
    )
  }

  return (
    <div className={`flex h-full ${isCollapsed ? 'w-16' : 'w-72'} flex-col bg-white border-r border-gray-200 shadow-sm transition-all duration-300`}>
      {/* Logo - Enhanced with better gradient and fixed logo */}
      <div className={`flex h-16 items-center ${isCollapsed ? 'flex-col justify-center space-y-2' : 'justify-between'} px-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700`}>
        {isCollapsed ? (
          <>
            <div className="w-8 h-8 bg-gradient-to-br from-blue-200 to-blue-300 rounded-lg flex items-center justify-center shadow-lg border border-blue-400">
              <span className="text-blue-800 font-bold text-sm drop-shadow-sm" suppressHydrationWarning>PP</span>
            </div>
            <button
              onClick={onToggle}
              className="text-white hover:bg-blue-900 hover:bg-opacity-70 p-1 rounded-md transition-all duration-200 bg-blue-800 bg-opacity-50 hover:scale-105 hover:shadow-lg"
              title="Rozwiń menu"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-200 to-blue-300 rounded-lg flex items-center justify-center shadow-lg border border-blue-400">
                <span className="text-blue-800 font-bold text-sm drop-shadow-sm" suppressHydrationWarning>PP</span>
              </div>
              <h1 className="ml-3 text-xl font-bold text-white tracking-wide">PrintPilot</h1>
            </div>
            <button
              onClick={onToggle}
              className="text-white hover:bg-blue-900 hover:bg-opacity-70 p-2 rounded-lg transition-all duration-200 bg-blue-800 bg-opacity-50 hover:scale-105 hover:shadow-lg"
              title="Zwiń menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Navigation - Shopify Style with sections */}
      <nav className={`flex-1 ${isCollapsed ? 'px-2' : 'px-4'} py-6 space-y-6 overflow-y-auto`}>
        {navigationSections.map((section) => {
          const isSectionCollapsed = collapsedSections.includes(section.name)
          
          return (
            <div key={section.name}>
              {!isCollapsed && (
                <button
                  onClick={() => toggleSection(section.name)}
                  className="flex items-center justify-between w-full px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors"
                >
                  <span>{section.name}</span>
                  {isSectionCollapsed ? (
                    <ChevronUpIcon className="h-4 w-4" />
                  ) : (
                    <ChevronDownIcon className="h-4 w-4" />
                  )}
                </button>
              )}
              
              {(!isSectionCollapsed || isCollapsed) && (
                <div className={`space-y-1 ${!isCollapsed ? 'mt-2' : ''}`}>
                  {section.items.map((item) => {
                    const isActive = pathname === item.href
                    const IconComponent = item.icon
                    
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`group flex items-center ${isCollapsed ? 'px-2 py-3 justify-center' : 'px-2 py-2'} text-sm font-medium rounded-lg transition-all duration-200 ${
                          isActive
                            ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border-l-4 border-blue-600 shadow-sm'
                            : 'text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 hover:text-blue-600'
                        }`}
                        title={isCollapsed ? item.name : undefined}
                      >
                        <IconComponent className={`flex-shrink-0 ${isCollapsed ? 'h-6 w-6' : 'h-5 w-5'} ${
                          isActive ? 'text-blue-600' : 'text-gray-500 group-hover:text-blue-500'
                        } transition-colors`} />
                        {!isCollapsed && (
                          <>
                            <span className="ml-3 font-medium">{item.name}</span>
                            {getBadgeContent(item.badge)}
                          </>
                        )}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className={`border-t border-gray-200 ${isCollapsed ? 'p-2' : 'p-4'}`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
          <div className={`${isCollapsed ? 'w-8 h-8' : 'w-10 h-10'} bg-gray-100 rounded-full flex items-center justify-center`}>
            <UserCircleIcon className={`${isCollapsed ? 'h-5 w-5' : 'h-6 w-6'} text-gray-600`} />
          </div>
          {!isCollapsed && (
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Operator</p>
              <p className="text-xs text-gray-500">PrintPilot</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}