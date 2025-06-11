import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'

/**
 * User roles and permissions
 */
export const USER_ROLES = {
  USER: 'USER',
  ADMIN: 'ADMIN'
} as const

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES]

/**
 * Authentication middleware for protecting API routes
 */
export async function requireAuth(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    return NextResponse.json(
      { 
        success: false,
        error: 'Unauthorized. Please log in to access this resource.' 
      },
      { status: 401 }
    )
  }
  
  return { session } // Return session for further use
}

/**
 * Role-based access control middleware
 */
export async function requireRole(request: NextRequest, allowedRoles: UserRole[]) {
  const authResult = await requireAuth(request)
  
  if (authResult instanceof NextResponse) {
    return authResult // Return error response from requireAuth
  }
  
  const { session } = authResult
  const userRole = session.user.role as UserRole
  
  if (!allowedRoles.includes(userRole)) {
    return NextResponse.json(
      { 
        success: false,
        error: 'Forbidden. You do not have permission to access this resource.' 
      },
      { status: 403 }
    )
  }
  
  return { session } // Continue with request
}

/**
 * Admin-only access middleware
 */
export async function requireAdmin(request: NextRequest) {
  return requireRole(request, [USER_ROLES.ADMIN])
}

/**
 * Rate limiting middleware (simple in-memory implementation)
 * For production, use Redis or database-backed rate limiting
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export function rateLimit(
  identifier: string,
  limit: number = 100,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
) {
  const now = Date.now()
  const key = identifier
  
  const current = rateLimitStore.get(key)
  
  if (!current || current.resetTime < now) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs
    })
    return null // Allow request
  }
  
  if (current.count >= limit) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    )
  }
  
  current.count++
  return null // Allow request
}

/**
 * Input validation helper using Zod schemas
 */
export function validateInput<T>(
  data: unknown,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; errors: string[]; error: string } {
  try {
    const validatedData = schema.parse(data)
    return { success: true, data: validatedData }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => {
        const path = err.path.length > 0 ? `${err.path.join('.')}: ` : ''
        return `${path}${err.message}`
      })
      return {
        success: false,
        errors,
        error: errors.join(', ')
      }
    }
    return {
      success: false,
      errors: ['Invalid input data'],
      error: error instanceof Error ? error.message : 'Invalid input data'
    }
  }
}

/**
 * Validate request body with Zod schema
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; response: NextResponse }> {
  try {
    const body = await request.json()
    const validation = validateInput(body, schema)
    
    if (!validation.success) {
      return {
        success: false,
        response: NextResponse.json(
          {
            success: false,
            error: 'Validation failed',
            details: validation.errors
          },
          { status: 400 }
        )
      }
    }
    
    return { success: true, data: validation.data }
  } catch (error) {
    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON data'
        },
        { status: 400 }
      )
    }
  }
}

/**
 * Sanitize error messages for client responses
 */
export function sanitizeError(error: unknown, includeDetails: boolean = false): string {
  if (process.env.NODE_ENV === 'production' && !includeDetails) {
    return 'An internal error occurred. Please try again later.'
  }
  
  if (error instanceof Error) {
    return error.message
  }
  
  return 'Unknown error occurred'
}

/**
 * Generate secure headers for API responses
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  return response
}