'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { formStyles } from '@/styles/colors'
import { 
  Cog6ToothIcon,
  BuildingOfficeIcon,
  CalculatorIcon,
  CubeIcon,
  BellIcon,
  TruckIcon,
  UserIcon,
  CommandLineIcon,
  PaintBrushIcon,
  CloudArrowUpIcon
} from '@heroicons/react/24/outline'

interface SystemConfig {
  id?: string
  // Company Information
  companyName?: string
  companyLogo?: string
  companyEmail?: string
  companyPhone?: string
  companyAddress?: string
  companyStreet?: string
  companyCity?: string
  companyPostalCode?: string
  companyCountry?: string
  companyNip?: string
  companyRegon?: string
  companyWebsite?: string
  
  // Business Settings
  defaultCurrency: string
  defaultTimezone: string
  businessHours?: string
  workingDays?: string
  
  // Notification Settings
  emailNotifications: boolean
  lowStockThreshold: number
  orderVolumeAlert: number
  notificationFrequency: string
  
  // Inventory Settings
  autoReorderEnabled: boolean
  reorderLeadDays: number
  safetyStockPercent: number
  
  // Shipping Settings
  defaultSenderName?: string
  defaultSenderAddress?: string
  shippingMarkup: number
  freeShippingThreshold?: number
  
  // Apaczka API Settings
  apaczkaAppId?: string
  apaczkaApiKey?: string
  apaczkaTestMode?: boolean
  
  // Furgonetka API Settings
  furgonetkaClientId?: string
  furgonetkaClientSecret?: string
  furgonetkaUsername?: string
  furgonetkaPassword?: string
  furgonetkaTestMode?: boolean
  
  // User Interface Settings
  dashboardLayout: string
  itemsPerPage: number
  chartDateRange: number
  exportFormat: string
  
  // Integration Settings
  adobeStockApiKey?: string
  adobeStockEnabled: boolean
  webhookRetryCount: number
  syncBatchSize: number
  
  // Production Settings
  rushOrderSurcharge: number
  maxDailyCapacity?: number
  productionLeadDays: number
  
  // Branding
  primaryColor: string
  secondaryColor: string
  logoPosition: string
  customCss?: string
  
  // Backup and Maintenance
  autoBackupEnabled: boolean
  backupFrequency: string
  dataRetentionMonths: number
}

const defaultConfig: SystemConfig = {
  // Company defaults
  companyName: 'PrintPilot',
  companyEmail: 'zreq5mjdf@gmail.com',
  companyPhone: '791888999',
  companyStreet: 'ul. Marii Dąbrowskiej 30A',
  companyCity: 'Dąbrowa Górnicza',
  companyPostalCode: '42-520',
  companyCountry: 'PL',
  
  defaultCurrency: 'PLN',
  defaultTimezone: 'Europe/Warsaw',
  emailNotifications: true,
  lowStockThreshold: 10,
  orderVolumeAlert: 50,
  notificationFrequency: 'REAL_TIME',
  autoReorderEnabled: false,
  reorderLeadDays: 7,
  safetyStockPercent: 20,
  shippingMarkup: 0,
  dashboardLayout: 'DEFAULT',
  itemsPerPage: 20,
  chartDateRange: 30,
  exportFormat: 'PDF',
  adobeStockEnabled: false,
  webhookRetryCount: 3,
  syncBatchSize: 50,
  rushOrderSurcharge: 25.0,
  productionLeadDays: 3,
  primaryColor: '#3B82F6',
  secondaryColor: '#6B7280',
  logoPosition: 'TOP_LEFT',
  autoBackupEnabled: true,
  backupFrequency: 'WEEKLY',
  dataRetentionMonths: 24
}

const settingsTabs = [
  { id: 'company', name: 'Firma', icon: BuildingOfficeIcon, description: 'Informacje o firmie i branding' },
  { id: 'production', name: 'Produkcja', icon: CalculatorIcon, description: 'Koszty i parametry produkcji' },
  { id: 'inventory', name: 'Magazyn', icon: CubeIcon, description: 'Zarządzanie zapasami' },
  { id: 'notifications', name: 'Powiadomienia', icon: BellIcon, description: 'Alerty i notyfikacje' },
  { id: 'shipping', name: 'Wysyłka', icon: TruckIcon, description: 'Ustawienia dostawy' },
  { id: 'interface', name: 'Interfejs', icon: UserIcon, description: 'Personalizacja dashboardu' },
  { id: 'integrations', name: 'Integracje', icon: CommandLineIcon, description: 'API i zewnętrzne usługi' },
  { id: 'branding', name: 'Wygląd', icon: PaintBrushIcon, description: 'Kolory i stylizacja' },
  { id: 'backup', name: 'Backup', icon: CloudArrowUpIcon, description: 'Kopie zapasowe danych' }
]

export default function SettingsPage() {
  const [config, setConfig] = useState<SystemConfig>(defaultConfig)
  const [activeTab, setActiveTab] = useState('company')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/settings')
      if (response.ok) {
        const data = await response.json()
        setConfig({ ...defaultConfig, ...data })
      } else {
        // First time setup - use defaults
        setConfig(defaultConfig)
      }
    } catch (error) {
      console.error('Error fetching config:', error)
      setConfig(defaultConfig)
    } finally {
      setLoading(false)
    }
  }

  const saveConfig = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })

      if (response.ok) {
        toast.success('Ustawienia zostały zapisane')
      } else {
        toast.error('Nie udało się zapisać ustawień')
      }
    } catch (error) {
      toast.error('Błąd podczas zapisywania ustawień')
    } finally {
      setSaving(false)
    }
  }

  const handleConfigChange = (field: string, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }))
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'company':
        return <CompanySettings config={config} onChange={handleConfigChange} />
      case 'production':
        return <ProductionSettings config={config} onChange={handleConfigChange} />
      case 'inventory':
        return <InventorySettings config={config} onChange={handleConfigChange} />
      case 'notifications':
        return <NotificationSettings config={config} onChange={handleConfigChange} />
      case 'shipping':
        return <ShippingSettings config={config} onChange={handleConfigChange} />
      case 'interface':
        return <InterfaceSettings config={config} onChange={handleConfigChange} />
      case 'integrations':
        return <IntegrationSettings config={config} onChange={handleConfigChange} />
      case 'branding':
        return <BrandingSettings config={config} onChange={handleConfigChange} />
      case 'backup':
        return <BackupSettings config={config} onChange={handleConfigChange} />
      default:
        return <CompanySettings config={config} onChange={handleConfigChange} />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Ładowanie ustawień...</p>
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
            <Cog6ToothIcon className="h-8 w-8 text-gray-600 mr-3" />
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 sm:text-3xl">Ustawienia systemu</h1>
              <p className="text-sm text-gray-600 mt-1">Skonfiguruj parametry systemu PrintPilot</p>
            </div>
          </div>
          <button
            onClick={saveConfig}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            {saving ? 'Zapisywanie...' : 'Zapisz ustawienia'}
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Settings Navigation */}
        <div className="w-80 bg-white rounded-xl border border-gray-200 p-6 h-fit">
          <nav className="space-y-2">
            {settingsTabs.map((tab) => {
              const IconComponent = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-start p-3 rounded-lg text-left transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <IconComponent className={`h-5 w-5 mr-3 mt-0.5 flex-shrink-0 ${
                    activeTab === tab.id ? 'text-blue-600' : 'text-gray-400'
                  }`} />
                  <div>
                    <div className="text-sm font-medium">{tab.name}</div>
                    <div className="text-xs text-gray-500 mt-1">{tab.description}</div>
                  </div>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Settings Content */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 p-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  )
}

// Company Settings Component
function CompanySettings({ config, onChange }: { config: SystemConfig, onChange: (field: string, value: any) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Informacje o firmie</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={formStyles.label}>Nazwa firmy</label>
            <input
              type="text"
              className={formStyles.input}
              value={config.companyName || ''}
              onChange={(e) => onChange('companyName', e.target.value)}
              placeholder="PrintPilot Sp. z o.o."
            />
          </div>

          <div>
            <label className={formStyles.label}>Email firmowy</label>
            <input
              type="email"
              className={formStyles.input}
              value={config.companyEmail || ''}
              onChange={(e) => onChange('companyEmail', e.target.value)}
              placeholder="kontakt@printpilot.pl"
            />
          </div>

          <div>
            <label className={formStyles.label}>Telefon</label>
            <input
              type="tel"
              className={formStyles.input}
              value={config.companyPhone || ''}
              onChange={(e) => onChange('companyPhone', e.target.value)}
              placeholder="+48 123 456 789"
            />
          </div>

          <div>
            <label className={formStyles.label}>Strona internetowa</label>
            <input
              type="url"
              className={formStyles.input}
              value={config.companyWebsite || ''}
              onChange={(e) => onChange('companyWebsite', e.target.value)}
              placeholder="https://printpilot.pl"
            />
          </div>

          <div>
            <label className={formStyles.label}>NIP</label>
            <input
              type="text"
              className={formStyles.input}
              value={config.companyNip || ''}
              onChange={(e) => onChange('companyNip', e.target.value)}
              placeholder="123-456-78-90"
            />
          </div>

          <div>
            <label className={formStyles.label}>REGON</label>
            <input
              type="text"
              className={formStyles.input}
              value={config.companyRegon || ''}
              onChange={(e) => onChange('companyRegon', e.target.value)}
              placeholder="123456789"
            />
          </div>
        </div>

        <div className="mt-6">
          <h4 className="text-base font-medium text-gray-900 mb-4">Adres firmy</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className={formStyles.label}>Ulica i numer</label>
              <input
                type="text"
                className={formStyles.input}
                value={config.companyStreet || ''}
                onChange={(e) => onChange('companyStreet', e.target.value)}
                placeholder="ul. Marii Dąbrowskiej 30A"
              />
            </div>
            
            <div>
              <label className={formStyles.label}>Miasto</label>
              <input
                type="text"
                className={formStyles.input}
                value={config.companyCity || ''}
                onChange={(e) => onChange('companyCity', e.target.value)}
                placeholder="Dąbrowa Górnicza"
              />
            </div>
            
            <div>
              <label className={formStyles.label}>Kod pocztowy</label>
              <input
                type="text"
                className={formStyles.input}
                value={config.companyPostalCode || ''}
                onChange={(e) => onChange('companyPostalCode', e.target.value)}
                placeholder="42-520"
              />
            </div>
            
            <div>
              <label className={formStyles.label}>Kraj</label>
              <select
                className={formStyles.select}
                value={config.companyCountry || 'PL'}
                onChange={(e) => onChange('companyCountry', e.target.value)}
              >
                <option value="PL">Polska</option>
                <option value="DE">Niemcy</option>
                <option value="CZ">Czechy</option>
                <option value="SK">Słowacja</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={formStyles.label}>Domyślna waluta</label>
            <select
              className={formStyles.select}
              value={config.defaultCurrency}
              onChange={(e) => onChange('defaultCurrency', e.target.value)}
            >
              <option value="PLN">PLN - Polski złoty</option>
              <option value="EUR">EUR - Euro</option>
              <option value="USD">USD - Dolar amerykański</option>
            </select>
          </div>

          <div>
            <label className={formStyles.label}>Strefa czasowa</label>
            <select
              className={formStyles.select}
              value={config.defaultTimezone}
              onChange={(e) => onChange('defaultTimezone', e.target.value)}
            >
              <option value="Europe/Warsaw">Europa/Warszawa</option>
              <option value="Europe/London">Europa/Londyn</option>
              <option value="Europe/Berlin">Europa/Berlin</option>
              <option value="America/New_York">Ameryka/Nowy Jork</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}

// Production Settings Component
function ProductionSettings({ config, onChange }: { config: SystemConfig, onChange: (field: string, value: any) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Parametry produkcji</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={formStyles.label}>Standardowy czas realizacji (dni)</label>
            <input
              type="number"
              min="1"
              max="30"
              className={formStyles.input}
              value={config.productionLeadDays}
              onChange={(e) => onChange('productionLeadDays', parseInt(e.target.value))}
            />
          </div>

          <div>
            <label className={formStyles.label}>Dopłata za ekspresową realizację (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              className={formStyles.input}
              value={config.rushOrderSurcharge}
              onChange={(e) => onChange('rushOrderSurcharge', parseFloat(e.target.value))}
            />
          </div>

          <div>
            <label className={formStyles.label}>Maksymalna dzienna wydajność (szt.)</label>
            <input
              type="number"
              min="1"
              className={formStyles.input}
              value={config.maxDailyCapacity || ''}
              onChange={(e) => onChange('maxDailyCapacity', e.target.value ? parseInt(e.target.value) : null)}
              placeholder="Brak limitu"
            />
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Konfiguracja kosztów produkcji</h4>
          <p className="text-sm text-blue-700">
            Szczegółowe ustawienia kosztów materiałów i marży są dostępne w sekcji "Koszty produkcji" w menu głównym.
          </p>
          <button
            onClick={() => window.location.href = '/dashboard/production-costs'}
            className="mt-2 inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors"
          >
            Przejdź do konfiguracji kosztów
          </button>
        </div>
      </div>
    </div>
  )
}

// Inventory Settings Component
function InventorySettings({ config, onChange }: { config: SystemConfig, onChange: (field: string, value: any) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Zarządzanie magazynem</h3>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="autoReorder"
              checked={config.autoReorderEnabled}
              onChange={(e) => onChange('autoReorderEnabled', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="autoReorder" className="text-sm font-medium text-gray-700">
              Automatyczne zamówienia uzupełniające
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className={formStyles.label}>Próg niskiego stanu (szt.)</label>
              <input
                type="number"
                min="1"
                className={formStyles.input}
                value={config.lowStockThreshold}
                onChange={(e) => onChange('lowStockThreshold', parseInt(e.target.value))}
              />
            </div>

            <div>
              <label className={formStyles.label}>Czas dostawy dostawcy (dni)</label>
              <input
                type="number"
                min="1"
                max="60"
                className={formStyles.input}
                value={config.reorderLeadDays}
                onChange={(e) => onChange('reorderLeadDays', parseInt(e.target.value))}
              />
            </div>

            <div>
              <label className={formStyles.label}>Zapas bezpieczeństwa (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                className={formStyles.input}
                value={config.safetyStockPercent}
                onChange={(e) => onChange('safetyStockPercent', parseInt(e.target.value))}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
          <h4 className="text-sm font-medium text-amber-900 mb-2">Zarządzanie zapasami</h4>
          <p className="text-sm text-amber-700">
            Szczegółowe zarządzanie stanem magazynu dostępne jest w sekcjach "Magazyn" i "Zapas kartonów".
          </p>
          <div className="mt-2 space-x-2">
            <button
              onClick={() => window.location.href = '/dashboard/inventory'}
              className="inline-flex items-center px-3 py-1.5 bg-amber-600 text-white text-xs rounded-lg hover:bg-amber-700 transition-colors"
            >
              Zarządzaj magazynem
            </button>
            <button
              onClick={() => window.location.href = '/dashboard/cardboard-inventory'}
              className="inline-flex items-center px-3 py-1.5 bg-amber-600 text-white text-xs rounded-lg hover:bg-amber-700 transition-colors"
            >
              Zapas kartonów
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Notification Settings Component
function NotificationSettings({ config, onChange }: { config: SystemConfig, onChange: (field: string, value: any) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Powiadomienia</h3>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="emailNotifications"
              checked={config.emailNotifications}
              onChange={(e) => onChange('emailNotifications', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="emailNotifications" className="text-sm font-medium text-gray-700">
              Powiadomienia email
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={formStyles.label}>Częstotliwość powiadomień</label>
              <select
                className={formStyles.select}
                value={config.notificationFrequency}
                onChange={(e) => onChange('notificationFrequency', e.target.value)}
              >
                <option value="REAL_TIME">W czasie rzeczywistym</option>
                <option value="HOURLY">Co godzinę</option>
                <option value="DAILY">Raz dziennie</option>
              </select>
            </div>

            <div>
              <label className={formStyles.label}>Alert przy dużej liczbie zamówień (dziennie)</label>
              <input
                type="number"
                min="1"
                className={formStyles.input}
                value={config.orderVolumeAlert}
                onChange={(e) => onChange('orderVolumeAlert', parseInt(e.target.value))}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Shipping Settings Component  
function ShippingSettings({ config, onChange }: { config: SystemConfig, onChange: (field: string, value: any) => void }) {
  const [testingApaczka, setTestingApaczka] = useState(false)
  const [apaczkaStatus, setApaczkaStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [testingFurgonetka, setTestingFurgonetka] = useState(false)
  const [furgonetkaStatus, setFurgonetkaStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const testApaczkaConnection = async () => {
    setTestingApaczka(true)
    try {
      const response = await fetch('/api/shipping/test-simple')
      const result = await response.json()
      
      if (result.success) {
        setApaczkaStatus('success')
        toast.success('Połączenie z Apaczka.pl działa poprawnie!')
      } else {
        setApaczkaStatus('error')
        toast.error(`Błąd połączenia: ${result.error}`)
      }
    } catch (error) {
      setApaczkaStatus('error')
      toast.error('Nie udało się przetestować połączenia')
    } finally {
      setTestingApaczka(false)
    }
  }

  const testFurgonetkaConnection = async () => {
    setTestingFurgonetka(true)
    try {
      const response = await fetch('/api/shipping/test-furgonetka')
      const result = await response.json()
      
      if (result.success) {
        setFurgonetkaStatus('success')
        toast.success('Połączenie z Furgonetka.pl działa poprawnie!')
      } else {
        setFurgonetkaStatus('error')
        toast.error(`Błąd połączenia: ${result.error}`)
      }
    } catch (error) {
      setFurgonetkaStatus('error')
      toast.error('Nie udało się przetestować połączenia')
    } finally {
      setTestingFurgonetka(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Ustawienia podstawowe */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Ustawienia podstawowe</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={formStyles.label}>Domyślny nadawca</label>
            <input
              type="text"
              className={formStyles.input}
              value={config.defaultSenderName || ''}
              onChange={(e) => onChange('defaultSenderName', e.target.value)}
              placeholder="PrintPilot Sp. z o.o."
            />
          </div>

          <div>
            <label className={formStyles.label}>Marża na wysyłce (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              className={formStyles.input}
              value={config.shippingMarkup}
              onChange={(e) => onChange('shippingMarkup', parseFloat(e.target.value))}
            />
          </div>

          <div>
            <label className={formStyles.label}>Darmowa wysyłka od kwoty (PLN)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className={formStyles.input}
              value={config.freeShippingThreshold || ''}
              onChange={(e) => onChange('freeShippingThreshold', e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="Brak progu"
            />
          </div>
        </div>

        <div className="mt-6">
          <label className={formStyles.label}>Adres nadawcy</label>
          <textarea
            className={formStyles.textarea}
            rows={3}
            value={config.defaultSenderAddress || ''}
            onChange={(e) => onChange('defaultSenderAddress', e.target.value)}
            placeholder="ul. Magazynowa 1&#10;00-001 Warszawa&#10;Polska"
          />
        </div>
      </div>

      {/* Apaczka.pl Web API */}
      <div className="border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-md font-medium text-gray-900">Apaczka.pl Web API</h4>
            <p className="text-sm text-gray-600 mt-1">Konfiguracja integracji z systemem kurierskim Apaczka.pl</p>
          </div>
          <div className="flex items-center space-x-2">
            {apaczkaStatus === 'success' && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Połączono
              </span>
            )}
            {apaczkaStatus === 'error' && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                Błąd
              </span>
            )}
            <button
              onClick={testApaczkaConnection}
              disabled={testingApaczka}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testingApaczka ? 'Testowanie...' : 'Testuj połączenie'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={formStyles.label}>App ID</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              value={config.apaczkaAppId || ''}
              onChange={(e) => onChange('apaczkaAppId', e.target.value)}
              placeholder="1348967_abc123xyz..."
            />
            <p className="text-xs text-gray-500 mt-1">Identyfikator aplikacji z panelu Apaczka.pl</p>
          </div>

          <div>
            <label className={formStyles.label}>App Secret</label>
            <input
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              value={config.apaczkaApiKey || ''}
              onChange={(e) => onChange('apaczkaApiKey', e.target.value)}
              placeholder="y2n6rynfnhuwmrpcs0ppij..."
            />
            <p className="text-xs text-gray-500 mt-1">Klucz sekretny do podpisywania żądań HMAC</p>
          </div>

          <div>
            <label className={formStyles.label}>Kod pocztowy firmy</label>
            <input
              type="text"
              className={formStyles.input}
              value={config.companyPostalCode || ''}
              onChange={(e) => onChange('companyPostalCode', e.target.value)}
              placeholder="00-001"
              pattern="[0-9]{2}-[0-9]{3}"
            />
            <p className="text-xs text-gray-500 mt-1">Kod pocztowy nadawcy do kalkulacji kosztów</p>
          </div>

          <div>
            <label className={formStyles.label}>Tryb testowy</label>
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="apaczkaTestMode"
                checked={config.apaczkaTestMode || false}
                onChange={(e) => onChange('apaczkaTestMode', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="apaczkaTestMode" className="text-sm text-gray-700">
                Używaj sandbox API (dla testów)
              </label>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h5 className="text-sm font-medium text-blue-900 mb-2">Instrukcja konfiguracji</h5>
          <div className="text-sm text-blue-700 space-y-1">
            <p>1. Zaloguj się do panelu <a href="https://panel.apaczka.pl" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-800">Apaczka.pl</a></p>
            <p>2. Przejdź do sekcji "Web API" w menu</p>
            <p>3. Dodaj nową aplikację i skopiuj App ID oraz App Secret</p>
            <p>4. Wprowadź dane powyżej i przetestuj połączenie</p>
          </div>
          <div className="mt-3 flex space-x-2">
            <a
              href="https://panel.apaczka.pl"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors"
            >
              Otwórz panel Apaczka.pl
            </a>
            <button
              onClick={() => window.location.href = '/dashboard/shipping'}
              className="inline-flex items-center px-3 py-1.5 border border-blue-300 text-blue-700 text-xs rounded-lg hover:bg-blue-50 transition-colors"
            >
              Zarządzaj wysyłkami
            </button>
          </div>
        </div>
      </div>

      {/* Furgonetka.pl API */}
      <div className="border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-md font-medium text-gray-900">Furgonetka.pl API</h4>
            <p className="text-sm text-gray-600 mt-1">Konfiguracja integracji z platformą kurierską Furgonetka.pl</p>
          </div>
          <div className="flex items-center space-x-2">
            {furgonetkaStatus === 'success' && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Połączono
              </span>
            )}
            {furgonetkaStatus === 'error' && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                Błąd
              </span>
            )}
            <button
              onClick={testFurgonetkaConnection}
              disabled={testingFurgonetka}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testingFurgonetka ? 'Testowanie...' : 'Testuj połączenie'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={formStyles.label}>Client ID</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              value={config.furgonetkaClientId || ''}
              onChange={(e) => onChange('furgonetkaClientId', e.target.value)}
              placeholder="your_client_id"
            />
            <p className="text-xs text-gray-500 mt-1">Identyfikator aplikacji z panelu OAuth2</p>
          </div>

          <div>
            <label className={formStyles.label}>Client Secret</label>
            <input
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              value={config.furgonetkaClientSecret || ''}
              onChange={(e) => onChange('furgonetkaClientSecret', e.target.value)}
              placeholder="your_client_secret"
            />
            <p className="text-xs text-gray-500 mt-1">Tajny klucz OAuth2 do uwierzytelnienia</p>
          </div>

          <div>
            <label className={formStyles.label}>Nazwa użytkownika</label>
            <input
              type="text"
              className={formStyles.input}
              value={config.furgonetkaUsername || ''}
              onChange={(e) => onChange('furgonetkaUsername', e.target.value)}
              placeholder="user@example.com"
            />
            <p className="text-xs text-gray-500 mt-1">Email konta Furgonetka.pl</p>
          </div>

          <div>
            <label className={formStyles.label}>Hasło</label>
            <input
              type="password"
              className={formStyles.input}
              value={config.furgonetkaPassword || ''}
              onChange={(e) => onChange('furgonetkaPassword', e.target.value)}
              placeholder="hasło_konta"
            />
            <p className="text-xs text-gray-500 mt-1">Hasło do konta Furgonetka.pl</p>
          </div>

          <div className="md:col-span-2">
            <label className={formStyles.label}>Tryb testowy</label>
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="furgonetkaTestMode"
                checked={config.furgonetkaTestMode || false}
                onChange={(e) => onChange('furgonetkaTestMode', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="furgonetkaTestMode" className="text-sm text-gray-700">
                Używaj sandbox API (dla testów)
              </label>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
          <h5 className="text-sm font-medium text-orange-900 mb-2">Instrukcja konfiguracji</h5>
          <div className="text-sm text-orange-700 space-y-1">
            <p>1. Zaloguj się do swojego konta <a href="https://furgonetka.pl" target="_blank" rel="noopener noreferrer" className="underline hover:text-orange-800">Furgonetka.pl</a></p>
            <p>2. Przejdź do sekcji OAuth2 w panelu użytkownika</p>
            <p>3. Utwórz nową aplikację i skopiuj Client ID oraz Client Secret</p>
            <p>4. Wprowadź dane logowania do konta oraz dane OAuth2</p>
            <p>5. Przetestuj połączenie używając przycisku powyżej</p>
          </div>
          <div className="mt-3 flex space-x-2">
            <a
              href="https://furgonetka.pl"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-3 py-1.5 bg-orange-600 text-white text-xs rounded-lg hover:bg-orange-700 transition-colors"
            >
              Otwórz Furgonetka.pl
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

// Interface Settings Component
function InterfaceSettings({ config, onChange }: { config: SystemConfig, onChange: (field: string, value: any) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Preferencje interfejsu</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className={formStyles.label}>Elementów na stronę</label>
            <select
              className={formStyles.select}
              value={config.itemsPerPage}
              onChange={(e) => onChange('itemsPerPage', parseInt(e.target.value))}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div>
            <label className={formStyles.label}>Zakres wykresów (dni)</label>
            <select
              className={formStyles.select}
              value={config.chartDateRange}
              onChange={(e) => onChange('chartDateRange', parseInt(e.target.value))}
            >
              <option value={7}>7 dni</option>
              <option value={30}>30 dni</option>
              <option value={90}>90 dni</option>
              <option value={365}>365 dni</option>
            </select>
          </div>

          <div>
            <label className={formStyles.label}>Format eksportu</label>
            <select
              className={formStyles.select}
              value={config.exportFormat}
              onChange={(e) => onChange('exportFormat', e.target.value)}
            >
              <option value="PDF">PDF</option>
              <option value="EXCEL">Excel</option>
              <option value="CSV">CSV</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}

// Integration Settings Component
function IntegrationSettings({ config, onChange }: { config: SystemConfig, onChange: (field: string, value: any) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Integracje zewnętrzne</h3>
        
        <div className="space-y-6">
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="text-md font-medium text-gray-900 mb-3">Adobe Stock</h4>
            <div className="flex items-center space-x-3 mb-3">
              <input
                type="checkbox"
                id="adobeStockEnabled"
                checked={config.adobeStockEnabled}
                onChange={(e) => onChange('adobeStockEnabled', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="adobeStockEnabled" className="text-sm font-medium text-gray-700">
                Włącz integrację Adobe Stock
              </label>
            </div>
            <div>
              <label className={formStyles.label}>Klucz API</label>
              <input
                type="password"
                className={formStyles.input}
                value={config.adobeStockApiKey || ''}
                onChange={(e) => onChange('adobeStockApiKey', e.target.value)}
                placeholder="Wprowadź klucz API Adobe Stock"
              />
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="text-md font-medium text-gray-900 mb-3">Synchronizacja</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={formStyles.label}>Rozmiar pakietu sync (zamówienia)</label>
                <input
                  type="number"
                  min="10"
                  max="200"
                  className={formStyles.input}
                  value={config.syncBatchSize}
                  onChange={(e) => onChange('syncBatchSize', parseInt(e.target.value))}
                />
              </div>

              <div>
                <label className={formStyles.label}>Liczba ponownych prób</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  className={formStyles.input}
                  value={config.webhookRetryCount}
                  onChange={(e) => onChange('webhookRetryCount', parseInt(e.target.value))}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Branding Settings Component
function BrandingSettings({ config, onChange }: { config: SystemConfig, onChange: (field: string, value: any) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Stylizacja</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={formStyles.label}>Kolor główny</label>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                className="h-10 w-20 border border-gray-300 rounded-lg cursor-pointer"
                value={config.primaryColor}
                onChange={(e) => onChange('primaryColor', e.target.value)}
              />
              <input
                type="text"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={config.primaryColor}
                onChange={(e) => onChange('primaryColor', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className={formStyles.label}>Kolor drugorzędny</label>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                className="h-10 w-20 border border-gray-300 rounded-lg cursor-pointer"
                value={config.secondaryColor}
                onChange={(e) => onChange('secondaryColor', e.target.value)}
              />
              <input
                type="text"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={config.secondaryColor}
                onChange={(e) => onChange('secondaryColor', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className={formStyles.label}>Pozycja logo</label>
            <select
              className={formStyles.select}
              value={config.logoPosition}
              onChange={(e) => onChange('logoPosition', e.target.value)}
            >
              <option value="TOP_LEFT">Góra lewa</option>
              <option value="TOP_CENTER">Góra środek</option>
              <option value="TOP_RIGHT">Góra prawa</option>
            </select>
          </div>
        </div>

        <div className="mt-6">
          <label className={formStyles.label}>Własny CSS</label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            rows={6}
            value={config.customCss || ''}
            onChange={(e) => onChange('customCss', e.target.value)}
            placeholder="/* Dodaj własne style CSS */&#10;.dashboard-header {&#10;  background: linear-gradient(45deg, #1e3a8a, #3b82f6);&#10;}"
          />
        </div>
      </div>
    </div>
  )
}

// Backup Settings Component
function BackupSettings({ config, onChange }: { config: SystemConfig, onChange: (field: string, value: any) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Kopie zapasowe i archiwizacja</h3>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="autoBackupEnabled"
              checked={config.autoBackupEnabled}
              onChange={(e) => onChange('autoBackupEnabled', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="autoBackupEnabled" className="text-sm font-medium text-gray-700">
              Automatyczne kopie zapasowe
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={formStyles.label}>Częstotliwość kopii</label>
              <select
                className={formStyles.select}
                value={config.backupFrequency}
                onChange={(e) => onChange('backupFrequency', e.target.value)}
              >
                <option value="DAILY">Codziennie</option>
                <option value="WEEKLY">Co tydzień</option>
                <option value="MONTHLY">Co miesiąc</option>
              </select>
            </div>

            <div>
              <label className={formStyles.label}>Przechowywanie danych (miesięcy)</label>
              <input
                type="number"
                min="1"
                max="120"
                className={formStyles.input}
                value={config.dataRetentionMonths}
                onChange={(e) => onChange('dataRetentionMonths', parseInt(e.target.value))}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
          <h4 className="text-sm font-medium text-green-900 mb-2">Status kopii zapasowych</h4>
          <p className="text-sm text-green-700">
            Ostatnia kopia zapasowa: {config.id ? 'Nigdy' : 'Brak danych'}
          </p>
          <button className="mt-2 inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors">
            Utwórz kopię teraz
          </button>
        </div>
      </div>
    </div>
  )
}