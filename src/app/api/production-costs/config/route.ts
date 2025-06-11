import { NextRequest, NextResponse } from 'next/server'
import { getProductionCostConfig, updateProductionCostConfig } from '@/lib/production-cost-calculator'
import { requireAuth, rateLimit, validateInput, sanitizeError, addSecurityHeaders } from '@/lib/auth-middleware'
import { productionCostConfigSchema } from '@/lib/validation-schemas'

export async function GET(request: NextRequest) {
  try {
    // Security: Require authentication
    const authError = await requireAuth(request)
    if (authError) return authError

    // Security: Rate limiting
    const rateLimitError = rateLimit('production-config-get', 100)
    if (rateLimitError) return rateLimitError

    const config = await getProductionCostConfig()
    
    // Security: Filter sensitive data if needed
    const response = NextResponse.json(config)
    return addSecurityHeaders(response)
  } catch (error) {
    console.error('Error fetching production cost config:', sanitizeError(error, true))
    const response = NextResponse.json(
      { error: sanitizeError(error) },
      { status: 500 }
    )
    return addSecurityHeaders(response)
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Security: Require authentication
    const authError = await requireAuth(request)
    if (authError) return authError

    // Security: Rate limiting (stricter for write operations)
    const rateLimitError = rateLimit('production-config-update', 20)
    if (rateLimitError) return rateLimitError

    const body = await request.json()
    
    // Security: Input validation
    const validation = validateInput(body, productionCostConfigSchema.partial())
    if (!validation.success) {
      const response = NextResponse.json(
        { error: 'Invalid input data', details: validation.error },
        { status: 400 }
      )
      return addSecurityHeaders(response)
    }

    const config = await updateProductionCostConfig(validation.data)
    
    const response = NextResponse.json(config)
    return addSecurityHeaders(response)
  } catch (error) {
    console.error('Error updating production cost config:', sanitizeError(error, true))
    const response = NextResponse.json(
      { error: sanitizeError(error) },
      { status: 500 }
    )
    return addSecurityHeaders(response)
  }
}