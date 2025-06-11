'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { 
  CalendarDaysIcon,
  PlusIcon,
  ClockIcon,
  UserIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PlayIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

interface ProductionPlan {
  id: string
  planDate: string
  shift: string
  availableHours: number
  workersCount: number
  capacity: number
  status: string
  plannedItems: number
  completedItems: number
  efficiency: number
  tasks: ProductionTask[]
}

interface ProductionTask {
  id: string
  planId: string
  orderId: string
  orderItemId: string
  priority: string
  sequence: number
  estimatedTime: number
  actualTime?: number
  status: string
  assignedTo?: string
  assignedAt?: string
  startedAt?: string
  completedAt?: string
  notes?: string
  issues?: string
}

interface ProductionStats {
  totalPlans: number
  completedPlans: number
  averageEfficiency: number
  totalTasks: number
  completedTasks: number
  averageTaskTime: number
  capacityUtilization: number
  onTimeCompletion: number
}

const shiftLabels = {
  DAY: 'Dzienna',
  NIGHT: 'Nocna',
  FULL_DAY: 'Cały dzień'
}

const statusLabels = {
  DRAFT: 'Szkic',
  CONFIRMED: 'Potwierdzony',
  IN_PROGRESS: 'W realizacji',
  COMPLETED: 'Zakończony',
  CANCELLED: 'Anulowany'
}

const taskStatusLabels = {
  PENDING: 'Oczekuje',
  IN_PROGRESS: 'W realizacji',
  COMPLETED: 'Zakończone',
  CANCELLED: 'Anulowane',
  ON_HOLD: 'Wstrzymane'
}

const priorityLabels = {
  LOW: 'Niski',
  MEDIUM: 'Średni',
  HIGH: 'Wysoki',
  URGENT: 'Pilny'
}

export default function PlanningPage() {
  const [plans, setPlans] = useState<ProductionPlan[]>([])
  const [stats, setStats] = useState<ProductionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showNewPlan, setShowNewPlan] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<ProductionPlan | null>(null)
  const [dateRange, setDateRange] = useState(7) // days

  useEffect(() => {
    fetchData()
  }, [dateRange])

  const fetchData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        fetchPlans(),
        fetchStats()
      ])
    } finally {
      setLoading(false)
    }
  }

  const fetchPlans = async () => {
    try {
      const startDate = new Date()
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + dateRange)
      
      const response = await fetch(`/api/production/planning?action=plans&start_date=${startDate.toISOString().split('T')[0]}&end_date=${endDate.toISOString().split('T')[0]}`)
      const data = await response.json()
      if (data.success) {
        setPlans(data.data)
      }
    } catch (error) {
      console.error('Error fetching plans:', error)
      toast.error('Nie udało się pobrać planów produkcji')
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/production/planning?action=stats&days=30')
      const data = await response.json()
      if (data.success) {
        setStats(data.data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const createNewPlan = async () => {
    try {
      const planDate = new Date()
      planDate.setDate(planDate.getDate() + 1) // Tomorrow
      
      const constraints = {
        availableHours: 8,
        workersCount: 2,
        rushOrderSurcharge: 25,
        productionLeadDays: 3
      }

      const response = await fetch('/api/production/planning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_plan',
          planDate: planDate.toISOString().split('T')[0],
          shift: 'DAY',
          constraints
        })
      })
      
      const data = await response.json()
      if (data.success) {
        toast.success('Plan produkcji został utworzony')
        fetchPlans()
        setShowNewPlan(false)
      } else {
        toast.error('Nie udało się utworzyć planu')
      }
    } catch (error) {
      console.error('Error creating plan:', error)
      toast.error('Błąd podczas tworzenia planu')
    }
  }

  const startTask = async (taskId: string) => {
    try {
      const response = await fetch('/api/production/planning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start_task',
          taskId,
          operatorId: 'operator1'
        })
      })
      
      const data = await response.json()
      if (data.success) {
        toast.success('Zadanie rozpoczęte')
        fetchPlans()
      }
    } catch (error) {
      console.error('Error starting task:', error)
      toast.error('Błąd podczas rozpoczynania zadania')
    }
  }

  const completeTask = async (taskId: string) => {
    try {
      const response = await fetch('/api/production/planning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete_task',
          completeTaskId: taskId,
          actualTime: 1800, // 30 minutes
          notes: 'Zadanie zakończone pomyślnie'
        })
      })
      
      const data = await response.json()
      if (data.success) {
        toast.success('Zadanie zakończone')
        fetchPlans()
      }
    } catch (error) {
      console.error('Error completing task:', error)
      toast.error('Błąd podczas kończenia zadania')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-800'
      case 'CONFIRMED': return 'bg-blue-100 text-blue-800'
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800'
      case 'COMPLETED': return 'bg-green-100 text-green-800'
      case 'CANCELLED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'LOW': return 'bg-gray-100 text-gray-800'
      case 'MEDIUM': return 'bg-blue-100 text-blue-800'
      case 'HIGH': return 'bg-orange-100 text-orange-800'
      case 'URGENT': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Ładowanie planów produkcji...</p>
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
            <CalendarDaysIcon className="h-8 w-8 text-gray-600 mr-3" />
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 sm:text-3xl">Planowanie produkcji</h1>
              <p className="text-sm text-gray-600 mt-1">Zarządzanie zadaniami i harmonogramami produkcji</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(parseInt(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value={7}>7 dni</option>
              <option value={14}>14 dni</option>
              <option value={30}>30 dni</option>
            </select>
            <button
              onClick={() => setShowNewPlan(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Nowy plan
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CalendarDaysIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Plany ogółem</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalPlans}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Ukończone</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.completedPlans}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <ChartBarIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Średnia wydajność</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.averageEfficiency.toFixed(1)}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <ClockIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Punktualność</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.onTimeCompletion.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plans List */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Plany produkcji ({plans.length})
          </h2>
        </div>

        {plans.length === 0 ? (
          <div className="p-12 text-center">
            <CalendarDaysIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Brak planów produkcji</h3>
            <p className="text-gray-600 mb-6">
              Utwórz pierwszy plan produkcji aby rozpocząć zarządzanie zadaniami.
            </p>
            <button
              onClick={() => setShowNewPlan(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Utwórz plan
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {plans.map((plan) => (
              <div key={plan.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {new Date(plan.planDate).toLocaleDateString('pl-PL', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </h3>
                      <span className="ml-3 text-sm text-gray-600">
                        ({shiftLabels[plan.shift as keyof typeof shiftLabels]})
                      </span>
                      <span className={`ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(plan.status)}`}>
                        {statusLabels[plan.status as keyof typeof statusLabels]}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Dostępne godziny:</span>
                        <div className="font-semibold">{plan.availableHours}h</div>
                      </div>
                      
                      <div>
                        <span className="text-gray-500">Pracownicy:</span>
                        <div className="font-semibold">{plan.workersCount}</div>
                      </div>
                      
                      <div>
                        <span className="text-gray-500">Zadania:</span>
                        <div className="font-semibold">{plan.completedItems}/{plan.plannedItems}</div>
                      </div>
                      
                      <div>
                        <span className="text-gray-500">Wydajność:</span>
                        <div className={`font-semibold ${plan.efficiency >= 80 ? 'text-green-600' : plan.efficiency >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {plan.efficiency.toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    {/* Tasks Preview */}
                    {plan.tasks && plan.tasks.length > 0 && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-gray-900">Zadania ({plan.tasks.length})</h4>
                          <button
                            onClick={() => setSelectedPlan(selectedPlan?.id === plan.id ? null : plan)}
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            {selectedPlan?.id === plan.id ? 'Zwiń' : 'Rozwiń'}
                          </button>
                        </div>
                        
                        {selectedPlan?.id === plan.id && (
                          <div className="space-y-2">
                            {plan.tasks.slice(0, 5).map((task) => (
                              <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex-1">
                                  <div className="flex items-center">
                                    <span className="text-sm font-medium text-gray-900">
                                      Zadanie #{task.sequence}
                                    </span>
                                    <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                                      {priorityLabels[task.priority as keyof typeof priorityLabels]}
                                    </span>
                                    <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(task.status)}`}>
                                      {taskStatusLabels[task.status as keyof typeof taskStatusLabels]}
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-600 mt-1">
                                    Szacowany czas: {formatTime(task.estimatedTime)}
                                    {task.actualTime && ` | Rzeczywisty: ${formatTime(task.actualTime)}`}
                                  </div>
                                </div>

                                <div className="flex items-center space-x-2 ml-4">
                                  {task.status === 'PENDING' && (
                                    <button
                                      onClick={() => startTask(task.id)}
                                      className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                                      title="Rozpocznij zadanie"
                                    >
                                      <PlayIcon className="h-4 w-4" />
                                    </button>
                                  )}
                                  
                                  {task.status === 'IN_PROGRESS' && (
                                    <button
                                      onClick={() => completeTask(task.id)}
                                      className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                      title="Zakończ zadanie"
                                    >
                                      <CheckCircleIcon className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                            
                            {plan.tasks.length > 5 && (
                              <p className="text-xs text-gray-500 text-center">
                                ...oraz {plan.tasks.length - 5} innych zadań
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Plan Modal */}
      {showNewPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Utwórz nowy plan produkcji</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data planu
                  </label>
                  <input
                    type="date"
                    defaultValue={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Zmiana
                  </label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                    <option value="DAY">Dzienna (8:00-16:00)</option>
                    <option value="NIGHT">Nocna (22:00-6:00)</option>
                    <option value="FULL_DAY">Cały dzień (8:00-20:00)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Godziny pracy
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      defaultValue="8"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Liczba pracowników
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      defaultValue="2"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowNewPlan(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Anuluj
                </button>
                <button
                  onClick={createNewPlan}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Utwórz plan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}