import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'

function generateId() {
  return randomBytes(12).toString('base64url')
}

type ProductionOperation = 'FRAME_PREP' | 'FRAME_ASSEMBLY' | 'CANVAS_STRETCHING' | 'CUTTING' | 'CUTTING_CANVAS' | 'CUTTING_FRAME' | 'PRINTING' | 'PRINT_PREP' | 'PRINT_PROCESSING' | 'FRAMING' | 'FRAME_MOUNTING' | 'FRAME_FINISHING' | 'PACKAGING' | 'PACK_PROTECTION' | 'PACK_LABELING' | 'QUALITY_CHECK' | 'INVENTORY_PREP' | 'SETUP' | 'CLEANUP' | 'OTHER'
type TimerDifficulty = 'EASY' | 'MEDIUM' | 'HARD'
type TimerQuality = 'POOR' | 'GOOD' | 'EXCELLENT'

interface TimerSession {
  id: string
  orderId?: string
  orderItemId?: string
  operationType: ProductionOperation
  description?: string
  dimensions?: string
  startTime: Date
  endTime?: Date
  duration?: number
  pausedDuration: number
  unitsCount: number
  timePerUnit?: number
  operatorName?: string
  operatorId?: string
  difficulty: TimerDifficulty
  quality: TimerQuality
  notes?: string
  isCompleted: boolean
  isPaused: boolean
}

interface ProductionStats {
  totalOperations: number
  totalTime: number
  averageTimePerUnit: number
  operationStats: Record<ProductionOperation, {
    count: number
    totalTime: number
    averageTime: number
    averageTimePerUnit: number
  }>
  operatorStats: Record<string, {
    count: number
    totalTime: number
    averageTime: number
    efficiency: number
  }>
  qualityStats: Record<TimerQuality, number>
  difficultyStats: Record<TimerDifficulty, {
    count: number
    averageTime: number
  }>
}

export class ProductionTimerManager {
  
  // Rozpocznij nowy timer
  async startTimer(
    operationType: ProductionOperation,
    options: {
      orderId?: string
      orderItemId?: string
      description?: string
      dimensions?: string
      unitsCount?: number
      operatorName?: string
      operatorId?: string
      difficulty?: TimerDifficulty
      notes?: string
    } = {}
  ): Promise<TimerSession> {
    const timer = await prisma.production_timers.create({
      data: {
        id: generateId(),
        orderId: options.orderId,
        orderItemId: options.orderItemId,
        operationType,
        description: options.description,
        dimensions: options.dimensions,
        startTime: new Date(),
        unitsCount: options.unitsCount || 1,
        operatorName: options.operatorName,
        operatorId: options.operatorId,
        difficulty: options.difficulty || 'MEDIUM',
        quality: 'GOOD',
        notes: options.notes,
        isCompleted: false,
        isPaused: false,
        updatedAt: new Date()
      }
    })
    
    console.log(`⏱️ Started timer for ${operationType}: ${timer.id}`)
    return this.mapTimerToSession(timer)
  }
  
  // Zakończ timer
  async stopTimer(
    timerId: string,
    options: {
      quality?: TimerQuality
      notes?: string
      markItemsCompleted?: boolean
    } = {}
  ): Promise<TimerSession> {
    const timer = await prisma.production_timers.findUnique({
      where: { id: timerId },
      include: {
        order_items: true
      }
    })
    
    if (!timer) {
      throw new Error('Timer not found')
    }
    
    if (timer.isCompleted) {
      throw new Error('Timer already completed')
    }
    
    const endTime = new Date()
    const totalDuration = Math.floor((endTime.getTime() - timer.startTime.getTime()) / 1000)
    const workingDuration = totalDuration - timer.pausedDuration
    const timePerUnit = timer.unitsCount > 0 ? workingDuration / timer.unitsCount : workingDuration
    
    // Use transaction to update timer and handle item completion
    const result = await prisma.$transaction(async (tx) => {
      const updatedTimer = await tx.production_timers.update({
        where: { id: timerId },
        data: {
          endTime,
          duration: workingDuration,
          timePerUnit,
          quality: options.quality || timer.quality,
          notes: options.notes,
          isCompleted: true,
          isPaused: false
        }
      })
      
      // Handle item completion if timer is linked to an order item
      if (timer.orderItemId && (options.markItemsCompleted !== false)) {
        // Create completion record
        await tx.item_completions.create({
          data: {
            id: generateId(),
            orderItemId: timer.orderItemId,
            productionTimerId: timerId,
            operationType: timer.operationType,
            operatorName: timer.operatorName,
            notes: `Completed ${timer.unitsCount} units in ${this.formatTime(workingDuration)}`
          }
        })
        
        // Update order item completion count
        const orderItem = timer.order_items!
        const newCompletedCount = Math.min(
          orderItem.completedCount + timer.unitsCount,
          orderItem.quantity
        )
        const isFullyCompleted = newCompletedCount >= orderItem.quantity
        
        await tx.order_items.update({
          where: { id: timer.orderItemId },
          data: {
            completedCount: newCompletedCount,
            completionStatus: isFullyCompleted ? 'COMPLETED' : 'IN_PROGRESS',
            // Update print status for printing operations
            ...(timer.operationType === 'PRINTING' && isFullyCompleted && {
              printStatus: 'PRINTED',
              printedAt: new Date()
            })
          }
        })
        
        console.log(`✅ Updated completion: ${newCompletedCount}/${orderItem.quantity} for item ${timer.orderItemId}`)
      }
      
      return updatedTimer
    })
    
    console.log(`✅ Completed timer ${timerId}: ${workingDuration}s for ${timer.unitsCount} units`)
    return this.mapTimerToSession(result)
  }
  
  // Wstrzymaj timer
  async pauseTimer(timerId: string): Promise<TimerSession> {
    const timer = await prisma.production_timers.findUnique({
      where: { id: timerId }
    })
    
    if (!timer) {
      throw new Error('Timer not found')
    }
    
    if (timer.isCompleted) {
      throw new Error('Cannot pause completed timer')
    }
    
    if (timer.isPaused) {
      throw new Error('Timer is already paused')
    }
    
    const updatedTimer = await prisma.production_timers.update({
      where: { id: timerId },
      data: {
        isPaused: true,
        // Zapisz czas wstrzymania w notatce
        notes: timer.notes ? 
          `${timer.notes}\nPaused at: ${new Date().toISOString()}` :
          `Paused at: ${new Date().toISOString()}`
      }
    })
    
    console.log(`⏸️ Paused timer ${timerId}`)
    return this.mapTimerToSession(updatedTimer)
  }
  
  // Wznów timer
  async resumeTimer(timerId: string): Promise<TimerSession> {
    const timer = await prisma.production_timers.findUnique({
      where: { id: timerId }
    })
    
    if (!timer) {
      throw new Error('Timer not found')
    }
    
    if (timer.isCompleted) {
      throw new Error('Cannot resume completed timer')
    }
    
    if (!timer.isPaused) {
      throw new Error('Timer is not paused')
    }
    
    // Oblicz czas przerwy na podstawie ostatniego wpisu w notatkach
    let additionalPausedTime = 0
    if (timer.notes) {
      const pauseMatch = timer.notes.match(/Paused at: (.+)/)
      if (pauseMatch) {
        const pauseTime = new Date(pauseMatch[1])
        const resumeTime = new Date()
        additionalPausedTime = Math.floor((resumeTime.getTime() - pauseTime.getTime()) / 1000)
      }
    }
    
    const updatedTimer = await prisma.production_timers.update({
      where: { id: timerId },
      data: {
        isPaused: false,
        pausedDuration: timer.pausedDuration + additionalPausedTime,
        notes: timer.notes ? 
          `${timer.notes}\nResumed at: ${new Date().toISOString()}` :
          `Resumed at: ${new Date().toISOString()}`
      }
    })
    
    console.log(`▶️ Resumed timer ${timerId} (paused for ${additionalPausedTime}s)`)
    return this.mapTimerToSession(updatedTimer)
  }
  
  // Pobierz aktywne timery
  async getActiveTimers(operatorId?: string): Promise<TimerSession[]> {
    const where: any = {
      isCompleted: false
    }
    
    if (operatorId) {
      where.operatorId = operatorId
    }
    
    const timers = await prisma.production_timers.findMany({
      where,
      orderBy: { startTime: 'desc' },
      include: {
        orders: true,
        order_items: true
      }
    })
    
    return timers.map(timer => this.mapTimerToSession(timer))
  }
  
  // Pobierz historię timerów
  async getTimerHistory(
    days: number = 30,
    operationType?: ProductionOperation,
    operatorId?: string
  ): Promise<TimerSession[]> {
    const since = new Date()
    since.setDate(since.getDate() - days)
    
    const where: any = {
      startTime: { gte: since },
      isCompleted: true
    }
    
    if (operationType) {
      where.operationType = operationType
    }
    
    if (operatorId) {
      where.operatorId = operatorId
    }
    
    const timers = await prisma.production_timers.findMany({
      where,
      orderBy: { startTime: 'desc' },
      include: {
        orders: true,
        order_items: true
      }
    })
    
    return timers.map(timer => this.mapTimerToSession(timer))
  }

  // Pobierz timery dla konkretnej daty
  async getTimersForDate(
    date: string,
    operationType?: ProductionOperation,
    operatorId?: string
  ): Promise<TimerSession[]> {
    // Parse date and create date range for the whole day
    const startDate = new Date(date + 'T00:00:00.000Z')
    const endDate = new Date(date + 'T23:59:59.999Z')
    
    const where: any = {
      startTime: { 
        gte: startDate,
        lte: endDate
      }
    }
    
    if (operationType) {
      where.operationType = operationType
    }
    
    if (operatorId) {
      where.operatorId = operatorId
    }
    
    const timers = await prisma.production_timers.findMany({
      where,
      orderBy: { startTime: 'asc' },
      include: {
        orders: true,
        order_items: true
      }
    })
    
    return timers.map(timer => this.mapTimerToSession(timer))
  }
  
  // Oblicz statystyki produkcji
  async getProductionStats(days: number = 30): Promise<ProductionStats> {
    const since = new Date()
    since.setDate(since.getDate() - days)
    
    const timers = await prisma.production_timers.findMany({
      where: {
        startTime: { gte: since },
        isCompleted: true,
        duration: { not: null }
      }
    })
    
    const stats: ProductionStats = {
      totalOperations: timers.length,
      totalTime: 0,
      averageTimePerUnit: 0,
      operationStats: {} as any,
      operatorStats: {} as any,
      qualityStats: { POOR: 0, GOOD: 0, EXCELLENT: 0 },
      difficultyStats: {
        EASY: { count: 0, averageTime: 0 },
        MEDIUM: { count: 0, averageTime: 0 },
        HARD: { count: 0, averageTime: 0 }
      }
    }
    
    // Inicjalizuj statystyki operacji
    const operations: ProductionOperation[] = ['FRAME_PREP', 'FRAME_ASSEMBLY', 'CANVAS_STRETCHING', 'CUTTING', 'CUTTING_CANVAS', 'CUTTING_FRAME', 'PRINTING', 'PRINT_PREP', 'PRINT_PROCESSING', 'FRAMING', 'FRAME_MOUNTING', 'FRAME_FINISHING', 'PACKAGING', 'PACK_PROTECTION', 'PACK_LABELING', 'QUALITY_CHECK', 'INVENTORY_PREP', 'SETUP', 'CLEANUP', 'OTHER']
    operations.forEach(op => {
      stats.operationStats[op] = {
        count: 0,
        totalTime: 0,
        averageTime: 0,
        averageTimePerUnit: 0
      }
    })
    
    let totalUnits = 0
    
    for (const timer of timers) {
      const duration = timer.duration || 0
      const units = timer.unitsCount
      
      stats.totalTime += duration
      totalUnits += units
      
      // Statystyki operacji
      const opStat = stats.operationStats[timer.operationType as ProductionOperation]
      if (opStat) {
        opStat.count++
        opStat.totalTime += duration
        opStat.averageTime = opStat.totalTime / opStat.count
        opStat.averageTimePerUnit = timer.timePerUnit || 0
      }
      
      // Statystyki operatorów
      if (timer.operatorName) {
        if (!stats.operatorStats[timer.operatorName]) {
          stats.operatorStats[timer.operatorName] = {
            count: 0,
            totalTime: 0,
            averageTime: 0,
            efficiency: 0
          }
        }
        
        const opStats = stats.operatorStats[timer.operatorName]
        opStats.count++
        opStats.totalTime += duration
        opStats.averageTime = opStats.totalTime / opStats.count
      }
      
      // Statystyki jakości
      stats.qualityStats[timer.quality as TimerQuality]++
      
      // Statystyki trudności
      const diffStat = stats.difficultyStats[timer.difficulty as TimerDifficulty]
      diffStat.count++
      diffStat.averageTime = (diffStat.averageTime * (diffStat.count - 1) + duration) / diffStat.count
    }
    
    stats.averageTimePerUnit = totalUnits > 0 ? stats.totalTime / totalUnits : 0
    
    // Oblicz wydajność operatorów (względem średniej)
    const overallAverage = stats.totalOperations > 0 ? stats.totalTime / stats.totalOperations : 0
    Object.values(stats.operatorStats).forEach(opStat => {
      opStat.efficiency = overallAverage > 0 ? (overallAverage / opStat.averageTime) * 100 : 100
    })
    
    return stats
  }
  
  // Pobierz prognozy czasów produkcji
  async getTimeEstimates(
    operationType: ProductionOperation,
    unitsCount: number = 1,
    difficulty: TimerDifficulty = 'MEDIUM'
  ): Promise<{
    estimatedTime: number
    confidence: number
    basedOnSamples: number
  }> {
    const recentTimers = await prisma.production_timers.findMany({
      where: {
        operationType,
        difficulty,
        isCompleted: true,
        duration: { not: null },
        startTime: {
          gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // Ostatnie 3 miesiące
        }
      },
      orderBy: { startTime: 'desc' },
      take: 50 // Ostatnie 50 operacji
    })
    
    if (recentTimers.length === 0) {
      return {
        estimatedTime: unitsCount * 600, // Domyślnie 10 minut na jednostkę
        confidence: 0.1,
        basedOnSamples: 0
      }
    }
    
    const timesPerUnit = recentTimers
      .filter(t => t.timePerUnit && t.timePerUnit > 0)
      .map(t => t.timePerUnit!)
    
    if (timesPerUnit.length === 0) {
      return {
        estimatedTime: unitsCount * 600,
        confidence: 0.2,
        basedOnSamples: recentTimers.length
      }
    }
    
    const averageTimePerUnit = timesPerUnit.reduce((sum, time) => sum + time, 0) / timesPerUnit.length
    const variance = timesPerUnit.reduce((sum, time) => sum + Math.pow(time - averageTimePerUnit, 2), 0) / timesPerUnit.length
    const standardDeviation = Math.sqrt(variance)
    
    // Oblicz pewność na podstawie konsystencji danych
    const coefficientOfVariation = averageTimePerUnit > 0 ? standardDeviation / averageTimePerUnit : 1
    const confidence = Math.max(0.1, Math.min(0.95, 1 - Math.min(coefficientOfVariation, 1)))
    
    return {
      estimatedTime: Math.round(averageTimePerUnit * unitsCount),
      confidence,
      basedOnSamples: timesPerUnit.length
    }
  }
  
  // Narzędzia pomocnicze
  
  private formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  
  private mapTimerToSession(timer: any): TimerSession {
    return {
      id: timer.id,
      orderId: timer.orderId,
      orderItemId: timer.orderItemId,
      operationType: timer.operationType as ProductionOperation,
      description: timer.description,
      dimensions: timer.dimensions,
      startTime: timer.startTime,
      endTime: timer.endTime,
      duration: timer.duration,
      pausedDuration: timer.pausedDuration,
      unitsCount: timer.unitsCount,
      timePerUnit: timer.timePerUnit,
      operatorName: timer.operatorName,
      operatorId: timer.operatorId,
      difficulty: timer.difficulty as TimerDifficulty,
      quality: timer.quality as TimerQuality,
      notes: timer.notes,
      isCompleted: timer.isCompleted,
      isPaused: timer.isPaused
    }
  }
}

// Funkcje pomocnicze do eksportu

export async function startProductionTimer(
  operationType: ProductionOperation,
  options: {
    orderId?: string
    orderItemId?: string
    description?: string
    dimensions?: string
    unitsCount?: number
    operatorName?: string
    operatorId?: string
    difficulty?: TimerDifficulty
    notes?: string
  } = {}
): Promise<TimerSession> {
  const manager = new ProductionTimerManager()
  return await manager.startTimer(operationType, options)
}

export async function stopProductionTimer(
  timerId: string,
  options: {
    quality?: TimerQuality
    notes?: string
  } = {}
): Promise<TimerSession> {
  const manager = new ProductionTimerManager()
  return await manager.stopTimer(timerId, options)
}

export async function getProductionStatistics(days: number = 30): Promise<ProductionStats> {
  const manager = new ProductionTimerManager()
  return await manager.getProductionStats(days)
}

export async function estimateProductionTime(
  operationType: ProductionOperation,
  unitsCount: number = 1,
  difficulty: TimerDifficulty = 'MEDIUM'
): Promise<{
  estimatedTime: number
  confidence: number
  basedOnSamples: number
}> {
  const manager = new ProductionTimerManager()
  return await manager.getTimeEstimates(operationType, unitsCount, difficulty)
}