import { prisma } from '@/lib/prisma'
import { estimateProductionTime } from '@/lib/production-timer'
import { randomBytes } from 'crypto'

function generateId() {
  return randomBytes(12).toString('base64url')
}

type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'ON_HOLD'
type ProductionShift = 'DAY' | 'NIGHT' | 'FULL_DAY'
type PlanStatus = 'DRAFT' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

interface ProductionPlan {
  id?: string
  planDate: Date
  shift: ProductionShift
  availableHours: number
  workersCount: number
  capacity: number
  status: PlanStatus
  plannedItems: number
  completedItems: number
  efficiency: number
  tasks: ProductionTask[]
}

interface ProductionTask {
  id?: string
  planId: string
  orderId: string
  orderItemId: string
  priority: TaskPriority
  sequence: number
  estimatedTime: number
  actualTime?: number
  status: TaskStatus
  assignedTo?: string
  assignedAt?: Date
  startedAt?: Date
  completedAt?: Date
  notes?: string
  issues?: string
}

interface PlanningConstraints {
  maxDailyCapacity?: number
  availableHours: number
  workersCount: number
  rushOrderSurcharge: number
  productionLeadDays: number
}

interface PlanningResult {
  plan: ProductionPlan
  unscheduledTasks: ProductionTask[]
  recommendations: string[]
  capacityUtilization: number
  estimatedCompletion: Date
}

export class ProductionPlanner {
  
  // Utwórz nowy plan produkcji
  async createProductionPlan(
    planDate: Date,
    shift: ProductionShift = 'DAY',
    constraints: PlanningConstraints
  ): Promise<PlanningResult> {
    console.log(`📋 Creating production plan for ${planDate.toDateString()} (${shift} shift)`)
    
    // Sprawdź czy plan już istnieje
    const existingPlan = await prisma.production_plans.findUnique({
      where: {
        planDate_shift: {
          planDate,
          shift
        }
      }
    })
    
    if (existingPlan) {
      throw new Error(`Production plan already exists for ${planDate.toDateString()} ${shift} shift`)
    }
    
    // Pobierz zamówienia wymagające produkcji
    const pendingOrders = await this.getPendingOrders(planDate)
    
    // Stwórz zadania produkcyjne
    const tasks = await this.createProductionTasks(pendingOrders)
    
    // Priorytetyzuj zadania
    const prioritizedTasks = this.prioritizeTasks(tasks, planDate, constraints)
    
    // Zaplanuj zadania w ramach dostępnego czasu
    const { scheduledTasks, unscheduledTasks, recommendations } = this.scheduleTasks(
      prioritizedTasks,
      constraints
    )
    
    // Utwórz plan w bazie danych
    const plan = await prisma.production_plans.create({
      data: {
        id: generateId(),
        planDate,
        shift,
        availableHours: constraints.availableHours,
        workersCount: constraints.workersCount,
        capacity: constraints.maxDailyCapacity || 100,
        status: 'DRAFT',
        plannedItems: scheduledTasks.length,
        completedItems: 0,
        efficiency: 0,
        updatedAt: new Date()
      }
    })
    
    // Dodaj zadania do planu
    const createdTasks = []
    for (let i = 0; i < scheduledTasks.length; i++) {
      const task = scheduledTasks[i]
      const createdTask = await prisma.production_tasks.create({
        data: {
          id: generateId(),
          planId: plan.id,
          orderId: task.orderId,
          orderItemId: task.orderItemId,
          priority: task.priority,
          sequence: i + 1,
          estimatedTime: task.estimatedTime,
          status: 'PENDING'
        }
      })
      createdTasks.push(this.mapTaskToData(createdTask))
    }
    
    const capacityUtilization = constraints.availableHours > 0 ? 
      (scheduledTasks.reduce((sum, t) => sum + t.estimatedTime, 0) / (constraints.availableHours * 3600)) * 100 : 0
    
    const estimatedCompletionTime = scheduledTasks.reduce((sum, t) => sum + t.estimatedTime, 0)
    const estimatedCompletion = new Date(planDate.getTime() + (estimatedCompletionTime * 1000))
    
    console.log(`✅ Created production plan: ${scheduledTasks.length} tasks scheduled, ${unscheduledTasks.length} unscheduled`)
    
    return {
      plan: {
        ...this.mapPlanToData(plan),
        tasks: createdTasks
      },
      unscheduledTasks,
      recommendations,
      capacityUtilization,
      estimatedCompletion
    }
  }
  
  // Pobierz zamówienia wymagające produkcji
  private async getPendingOrders(planDate: Date): Promise<any[]> {
    const maxOrderDate = new Date(planDate)
    maxOrderDate.setDate(maxOrderDate.getDate() + 7) // Zamówienia do tygodnia do przodu
    
    return await prisma.orders.findMany({
      where: {
        status: { in: ['NEW', 'PROCESSING'] },
        orderDate: { lte: maxOrderDate }
      },
      include: {
        order_items: {
          where: {
            printStatus: { in: ['NOT_PRINTED', 'PRINTING'] }
          },
          include: {
            frame_requirements: true,
            production_costs: true
          }
        },
        order_profitability: true
      },
      orderBy: { orderDate: 'asc' }
    })
  }
  
  // Stwórz zadania produkcyjne z zamówień
  private async createProductionTasks(orders: any[]): Promise<ProductionTask[]> {
    const tasks: ProductionTask[] = []
    
    for (const order of orders) {
      for (const item of order.order_items) {
        // Oszacuj czas produkcji
        const timeEstimate = await estimateProductionTime(
          'FRAMING', // Główna operacja
          item.quantity,
          'MEDIUM'
        )
        
        tasks.push({
          planId: '', // Zostanie uzupełnione później
          orderId: order.id,
          orderItemId: item.id,
          priority: 'MEDIUM', // Zostanie określony w priorytetyzacji
          sequence: 0,
          estimatedTime: timeEstimate.estimatedTime,
          status: 'PENDING'
        })
      }
    }
    
    return tasks
  }
  
  // Priorytetyzuj zadania
  private prioritizeTasks(
    tasks: ProductionTask[],
    planDate: Date,
    constraints: PlanningConstraints
  ): ProductionTask[] {
    return tasks.map(task => {
      let priority: TaskPriority = 'MEDIUM'
      let priorityScore = 50
      
      // Pobierz dane zamówienia (powinny być cache'owane)
      // W rzeczywistej implementacji pobralibyśmy to z poprzedniego kroku
      
      // Czynniki wpływające na priorytet:
      
      // 1. Wiek zamówienia (im starsze, tym wyższy priorytet)
      const orderAge = (planDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      if (orderAge > 7) priorityScore += 30
      else if (orderAge > 3) priorityScore += 15
      
      // 2. Typ płatności (prepaid ma wyższy priorytet)
      // Można by sprawdzić paymentStatus === 'PAID'
      priorityScore += 10
      
      // 3. Wartość zamówienia (wyższe wartości = wyższy priorytet)
      // Można by sprawdzić order.totalAmount
      
      // 4. Dostępność materiałów
      // Można by sprawdzić stan magazynu
      
      // 5. Szczególne życzenia klienta
      // Można by sprawdzić czy to zamówienie ekspresowe
      
      // Określ priorytet na podstawie wyniku
      if (priorityScore >= 80) priority = 'URGENT'
      else if (priorityScore >= 65) priority = 'HIGH'
      else if (priorityScore >= 35) priority = 'MEDIUM'
      else priority = 'LOW'
      
      return {
        ...task,
        priority
      }
    }).sort((a, b) => {
      // Sortuj według priorytetu, potem według wieku zamówienia
      const priorityOrder = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }
      const aPriority = priorityOrder[a.priority]
      const bPriority = priorityOrder[b.priority]
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority
      }
      
      // Jeśli ten sam priorytet, sortuj według czasu szacunkowego (krótsze pierwsze)
      return a.estimatedTime - b.estimatedTime
    })
  }
  
  // Zaplanuj zadania w ramach dostępnego czasu
  private scheduleTasks(
    tasks: ProductionTask[],
    constraints: PlanningConstraints
  ): {
    scheduledTasks: ProductionTask[]
    unscheduledTasks: ProductionTask[]
    recommendations: string[]
  } {
    const scheduledTasks: ProductionTask[] = []
    const unscheduledTasks: ProductionTask[] = []
    const recommendations: string[] = []
    
    const availableTimeSeconds = constraints.availableHours * 3600
    const maxItems = constraints.maxDailyCapacity
    let usedTimeSeconds = 0
    let itemsCount = 0
    
    for (const task of tasks) {
      const wouldExceedTime = (usedTimeSeconds + task.estimatedTime) > availableTimeSeconds
      const wouldExceedCapacity = maxItems && (itemsCount + 1) > maxItems
      
      if (wouldExceedTime || wouldExceedCapacity) {
        unscheduledTasks.push(task)
        
        if (task.priority === 'URGENT') {
          recommendations.push(`🚨 Urgent task for order ${task.orderId} cannot be scheduled - consider overtime or additional workers`)
        }
      } else {
        scheduledTasks.push(task)
        usedTimeSeconds += task.estimatedTime
        itemsCount++
      }
    }
    
    // Dodaj rekomendacje
    if (unscheduledTasks.length > 0) {
      recommendations.push(`📋 ${unscheduledTasks.length} tasks could not be scheduled for this day`)
    }
    
    const utilizationRate = (usedTimeSeconds / availableTimeSeconds) * 100
    if (utilizationRate < 70) {
      recommendations.push(`⚡ Low capacity utilization (${utilizationRate.toFixed(1)}%) - consider taking on additional orders`)
    } else if (utilizationRate > 95) {
      recommendations.push(`⚠️ Very high capacity utilization (${utilizationRate.toFixed(1)}%) - consider extending hours or adding workers`)
    }
    
    return { scheduledTasks, unscheduledTasks, recommendations }
  }
  
  // Pobierz plan produkcji
  async getProductionPlan(planId: string): Promise<ProductionPlan | null> {
    const plan = await prisma.production_plans.findUnique({
      where: { id: planId },
      include: {
        production_tasks: {
          include: {
            orders: true,
            order_items: true
          },
          orderBy: { sequence: 'asc' }
        }
      }
    })
    
    if (!plan) {
      return null
    }
    
    return {
      ...this.mapPlanToData(plan),
      tasks: plan.production_tasks.map(t => this.mapTaskToData(t))
    }
  }
  
  // Pobierz plany produkcji dla zakresu dat
  async getProductionPlans(
    startDate: Date,
    endDate: Date,
    shift?: ProductionShift
  ): Promise<ProductionPlan[]> {
    const where: any = {
      planDate: {
        gte: startDate,
        lte: endDate
      }
    }
    
    if (shift) {
      where.shift = shift
    }
    
    const plans = await prisma.production_plans.findMany({
      where,
      include: {
        production_tasks: {
          include: {
            orders: true,
            order_items: true
          },
          orderBy: { sequence: 'asc' }
        }
      },
      orderBy: [
        { planDate: 'asc' },
        { shift: 'asc' }
      ]
    })
    
    return plans.map(plan => ({
      ...this.mapPlanToData(plan),
      tasks: plan.production_tasks.map(t => this.mapTaskToData(t))
    }))
  }
  
  // Rozpocznij zadanie
  async startTask(taskId: string, operatorId?: string): Promise<ProductionTask> {
    const task = await prisma.production_tasks.update({
      where: { id: taskId },
      data: {
        status: 'IN_PROGRESS',
        assignedTo: operatorId,
        assignedAt: operatorId ? new Date() : undefined,
        startedAt: new Date()
      }
    })
    
    console.log(`▶️ Started production task: ${taskId}`)
    return this.mapTaskToData(task)
  }
  
  // Zakończ zadanie
  async completeTask(
    taskId: string,
    actualTime?: number,
    notes?: string,
    issues?: string
  ): Promise<ProductionTask> {
    const task = await prisma.production_tasks.update({
      where: { id: taskId },
      data: {
        status: 'COMPLETED',
        actualTime,
        completedAt: new Date(),
        notes,
        issues
      }
    })
    
    // Aktualizuj statystyki planu
    await this.updatePlanStatistics(task.planId)
    
    console.log(`✅ Completed production task: ${taskId}`)
    return this.mapTaskToData(task)
  }
  
  // Aktualizuj priorytet zadania
  async updateTaskPriority(taskId: string, priority: TaskPriority): Promise<ProductionTask> {
    const task = await prisma.production_tasks.update({
      where: { id: taskId },
      data: { priority }
    })
    
    console.log(`🎯 Updated task ${taskId} priority to ${priority}`)
    return this.mapTaskToData(task)
  }
  
  // Zmień kolejność zadań
  async reorderTasks(planId: string, taskSequences: Array<{ taskId: string, sequence: number }>): Promise<void> {
    for (const { taskId, sequence } of taskSequences) {
      await prisma.production_tasks.update({
        where: { id: taskId },
        data: { sequence }
      })
    }
    
    console.log(`🔄 Reordered ${taskSequences.length} tasks in plan ${planId}`)
  }
  
  // Aktualizuj statystyki planu
  private async updatePlanStatistics(planId: string): Promise<void> {
    const plan = await prisma.production_plans.findUnique({
      where: { id: planId },
      include: { production_tasks: true }
    })
    
    if (!plan) return
    
    const completedTasks = plan.production_tasks.filter(t => t.status === 'COMPLETED')
    const efficiency = plan.production_tasks.length > 0 ? (completedTasks.length / plan.production_tasks.length) * 100 : 0
    
    await prisma.production_plans.update({
      where: { id: planId },
      data: {
        completedItems: completedTasks.length,
        efficiency
      }
    })
  }
  
  // Pobierz statystyki wydajności
  async getProductionStatistics(days: number = 30): Promise<{
    totalPlans: number
    completedPlans: number
    averageEfficiency: number
    totalTasks: number
    completedTasks: number
    averageTaskTime: number
    capacityUtilization: number
    onTimeCompletion: number
  }> {
    const since = new Date()
    since.setDate(since.getDate() - days)
    
    const plans = await prisma.production_plans.findMany({
      where: {
        planDate: { gte: since }
      },
      include: { production_tasks: true }
    })
    
    const completedPlans = plans.filter(p => p.status === 'COMPLETED')
    const allTasks = plans.flatMap(p => p.production_tasks)
    const completedTasks = allTasks.filter(t => t.status === 'COMPLETED')
    
    const totalEfficiency = plans.reduce((sum, p) => sum + p.efficiency, 0)
    const averageEfficiency = plans.length > 0 ? totalEfficiency / plans.length : 0
    
    const tasksWithActualTime = completedTasks.filter(t => t.actualTime)
    const averageTaskTime = tasksWithActualTime.length > 0 ?
      tasksWithActualTime.reduce((sum, t) => sum + (t.actualTime || 0), 0) / tasksWithActualTime.length : 0
    
    const totalCapacity = plans.reduce((sum, p) => sum + (p.availableHours * 3600), 0)
    const usedCapacity = completedTasks.reduce((sum, t) => sum + (t.actualTime || t.estimatedTime), 0)
    const capacityUtilization = totalCapacity > 0 ? (usedCapacity / totalCapacity) * 100 : 0
    
    // Zadania zakończone na czas (w ramach szacowanego czasu + 20%)
    const onTimeTasks = tasksWithActualTime.filter(t => 
      t.actualTime! <= (t.estimatedTime * 1.2)
    )
    const onTimeCompletion = tasksWithActualTime.length > 0 ? 
      (onTimeTasks.length / tasksWithActualTime.length) * 100 : 0
    
    return {
      totalPlans: plans.length,
      completedPlans: completedPlans.length,
      averageEfficiency,
      totalTasks: allTasks.length,
      completedTasks: completedTasks.length,
      averageTaskTime,
      capacityUtilization,
      onTimeCompletion
    }
  }
  
  // Narzędzia pomocnicze
  
  private mapPlanToData(plan: any): ProductionPlan {
    return {
      id: plan.id,
      planDate: plan.planDate,
      shift: plan.shift as ProductionShift,
      availableHours: plan.availableHours,
      workersCount: plan.workersCount,
      capacity: plan.capacity,
      status: plan.status as PlanStatus,
      plannedItems: plan.plannedItems,
      completedItems: plan.completedItems,
      efficiency: plan.efficiency,
      tasks: []
    }
  }
  
  private mapTaskToData(task: any): ProductionTask {
    return {
      id: task.id,
      planId: task.planId,
      orderId: task.orderId,
      orderItemId: task.orderItemId,
      priority: task.priority as TaskPriority,
      sequence: task.sequence,
      estimatedTime: task.estimatedTime,
      actualTime: task.actualTime,
      status: task.status as TaskStatus,
      assignedTo: task.assignedTo,
      assignedAt: task.assignedAt,
      startedAt: task.startedAt,
      completedAt: task.completedAt,
      notes: task.notes,
      issues: task.issues
    }
  }
}

// Funkcje pomocnicze do eksportu

export async function createProductionPlan(
  planDate: Date,
  shift: ProductionShift = 'DAY',
  constraints: PlanningConstraints
): Promise<PlanningResult> {
  const planner = new ProductionPlanner()
  return await planner.createProductionPlan(planDate, shift, constraints)
}

export async function getProductionPlans(
  startDate: Date,
  endDate: Date,
  shift?: ProductionShift
): Promise<ProductionPlan[]> {
  const planner = new ProductionPlanner()
  return await planner.getProductionPlans(startDate, endDate, shift)
}

export async function getProductionStatistics(days: number = 30) {
  const planner = new ProductionPlanner()
  return await planner.getProductionStatistics(days)
}