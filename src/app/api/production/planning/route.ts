import { NextRequest, NextResponse } from 'next/server'
import { ProductionPlanner, createProductionPlan, getProductionPlans, getProductionStatistics } from '@/lib/production-planner'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'plans'
    const planId = searchParams.get('plan_id')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const shift = searchParams.get('shift') as any
    const days = parseInt(searchParams.get('days') || '30')
    
    const planner = new ProductionPlanner()
    
    switch (action) {
      case 'plans':
        // Pobierz plany produkcji dla zakresu dat
        if (!startDate || !endDate) {
          return NextResponse.json({
            error: 'start_date and end_date parameters are required'
          }, { status: 400 })
        }
        
        const plans = await getProductionPlans(
          new Date(startDate),
          new Date(endDate),
          shift
        )
        
        return NextResponse.json({
          success: true,
          data: plans,
          count: plans.length
        })
        
      case 'plan':
        // Pobierz konkretny plan
        if (!planId) {
          return NextResponse.json({
            error: 'plan_id parameter is required'
          }, { status: 400 })
        }
        
        const plan = await planner.getProductionPlan(planId)
        if (!plan) {
          return NextResponse.json({
            error: 'Production plan not found'
          }, { status: 404 })
        }
        
        return NextResponse.json({
          success: true,
          data: plan
        })
        
      case 'stats':
        // Pobierz statystyki produkcji
        const stats = await getProductionStatistics(days)
        return NextResponse.json({
          success: true,
          data: stats
        })
        
      default:
        return NextResponse.json({
          error: 'Invalid action parameter'
        }, { status: 400 })
    }
    
  } catch (error) {
    console.error('Error in production planning GET:', error)
    return NextResponse.json({
      error: 'Failed to process production planning request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body
    
    const planner = new ProductionPlanner()
    
    switch (action) {
      case 'create_plan':
        // Utwórz nowy plan produkcji
        const { planDate, shift = 'DAY', constraints } = body
        
        if (!planDate || !constraints) {
          return NextResponse.json({
            error: 'planDate and constraints are required'
          }, { status: 400 })
        }
        
        const planningResult = await createProductionPlan(
          new Date(planDate),
          shift,
          constraints
        )
        
        return NextResponse.json({
          success: true,
          message: 'Production plan created successfully',
          data: planningResult
        })
        
      case 'start_task':
        // Rozpocznij zadanie
        const { taskId, operatorId } = body
        
        if (!taskId) {
          return NextResponse.json({
            error: 'taskId is required'
          }, { status: 400 })
        }
        
        const startedTask = await planner.startTask(taskId, operatorId)
        
        return NextResponse.json({
          success: true,
          message: 'Task started successfully',
          data: startedTask
        })
        
      case 'complete_task':
        // Zakończ zadanie
        const { completeTaskId, actualTime, notes, issues } = body
        
        if (!completeTaskId) {
          return NextResponse.json({
            error: 'taskId is required'
          }, { status: 400 })
        }
        
        const completedTask = await planner.completeTask(
          completeTaskId,
          actualTime,
          notes,
          issues
        )
        
        return NextResponse.json({
          success: true,
          message: 'Task completed successfully',
          data: completedTask
        })
        
      case 'update_priority':
        // Zaktualizuj priorytet zadania
        const { updateTaskId, priority } = body
        
        if (!updateTaskId || !priority) {
          return NextResponse.json({
            error: 'taskId and priority are required'
          }, { status: 400 })
        }
        
        const updatedTask = await planner.updateTaskPriority(updateTaskId, priority)
        
        return NextResponse.json({
          success: true,
          message: 'Task priority updated successfully',
          data: updatedTask
        })
        
      case 'reorder_tasks':
        // Zmień kolejność zadań
        const { planId, taskSequences } = body
        
        if (!planId || !Array.isArray(taskSequences)) {
          return NextResponse.json({
            error: 'planId and taskSequences array are required'
          }, { status: 400 })
        }
        
        await planner.reorderTasks(planId, taskSequences)
        
        return NextResponse.json({
          success: true,
          message: 'Tasks reordered successfully'
        })
        
      case 'update_plan_status':
        // Zaktualizuj status planu
        const { updatePlanId, status } = body
        
        if (!updatePlanId || !status) {
          return NextResponse.json({
            error: 'planId and status are required'
          }, { status: 400 })
        }
        
        const { prisma } = await import('@/lib/prisma')
        const updatedPlan = await prisma.production_plans.update({
          where: { id: updatePlanId },
          data: { status }
        })
        
        return NextResponse.json({
          success: true,
          message: 'Plan status updated successfully',
          data: updatedPlan
        })
        
      default:
        return NextResponse.json({
          error: 'Invalid action parameter'
        }, { status: 400 })
    }
    
  } catch (error) {
    console.error('Error in production planning POST:', error)
    return NextResponse.json({
      error: 'Failed to process production planning request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const planId = searchParams.get('plan_id')
    const taskId = searchParams.get('task_id')
    
    const { prisma } = await import('@/lib/prisma')
    
    if (planId) {
      // Usuń plan produkcji (tylko szkice)
      const plan = await prisma.production_plans.findUnique({
        where: { id: planId }
      })
      
      if (!plan) {
        return NextResponse.json({
          error: 'Production plan not found'
        }, { status: 404 })
      }
      
      if (plan.status !== 'DRAFT') {
        return NextResponse.json({
          error: 'Can only delete draft plans'
        }, { status: 400 })
      }
      
      // Usuń plan i wszystkie powiązane zadania
      await prisma.production_plans.delete({
        where: { id: planId }
      })
      
      return NextResponse.json({
        success: true,
        message: 'Production plan deleted successfully'
      })
      
    } else if (taskId) {
      // Usuń zadanie (tylko pending)
      const task = await prisma.production_tasks.findUnique({
        where: { id: taskId }
      })
      
      if (!task) {
        return NextResponse.json({
          error: 'Production task not found'
        }, { status: 404 })
      }
      
      if (task.status !== 'PENDING') {
        return NextResponse.json({
          error: 'Can only delete pending tasks'
        }, { status: 400 })
      }
      
      await prisma.production_tasks.delete({
        where: { id: taskId }
      })
      
      return NextResponse.json({
        success: true,
        message: 'Production task deleted successfully'
      })
      
    } else {
      return NextResponse.json({
        error: 'Either plan_id or task_id is required'
      }, { status: 400 })
    }
    
  } catch (error) {
    console.error('Error in production planning DELETE:', error)
    return NextResponse.json({
      error: 'Failed to delete production planning resource',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}