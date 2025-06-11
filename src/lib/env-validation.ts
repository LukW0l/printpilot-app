import { z } from 'zod'

// Environment variable validation schema
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, "Database URL is required"),
  
  // NextAuth
  NEXTAUTH_SECRET: z.string().min(32, "NextAuth secret must be at least 32 characters"),
  NEXTAUTH_URL: z.string().url("NextAuth URL must be valid").optional(),
  
  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Optional WooCommerce API
  WOOCOMMERCE_API_URL: z.string().url().optional(),
  WOOCOMMERCE_CONSUMER_KEY: z.string().optional(),
  WOOCOMMERCE_CONSUMER_SECRET: z.string().optional(),
  
  // Optional Adobe Stock API
  ADOBE_STOCK_API_KEY: z.string().optional(),
  
  // Optional Shipping APIs
  PACZKA_API_KEY: z.string().optional(),
  INPOST_API_KEY: z.string().optional(),
  
  // Optional Email Service
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().regex(/^\d+$/).transform(Number).optional(),
  SMTP_USER: z.string().email().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),
})

// Validate environment variables on app startup
function validateEnv() {
  try {
    const env = envSchema.parse(process.env)
    console.log('✅ Environment variables validated successfully')
    return env
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment validation failed:')
      error.errors.forEach(err => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`)
      })
      
      if (process.env.NODE_ENV === 'production') {
        console.error('Application cannot start with invalid environment variables in production')
        process.exit(1)
      } else {
        console.warn('⚠️  Some environment variables are missing or invalid. App may not function correctly.')
      }
    }
    throw error
  }
}

// Export validated environment variables
export const env = validateEnv()

// Type for validated environment
export type ValidatedEnv = z.infer<typeof envSchema>

// Helper to check if required services are configured
export const serviceChecks = {
  isWooCommerceConfigured: () => 
    !!(env.WOOCOMMERCE_API_URL && env.WOOCOMMERCE_CONSUMER_KEY && env.WOOCOMMERCE_CONSUMER_SECRET),
  
  isAdobeStockConfigured: () => !!env.ADOBE_STOCK_API_KEY,
  
  isEmailConfigured: () => 
    !!(env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASS && env.EMAIL_FROM),
  
  isShippingConfigured: () => 
    !!(env.PACZKA_API_KEY || env.INPOST_API_KEY),
}

// Runtime environment checks
export function checkRequiredServices() {
  const checks = [
    { name: 'Database', configured: !!env.DATABASE_URL },
    { name: 'Authentication', configured: !!env.NEXTAUTH_SECRET },
    { name: 'WooCommerce', configured: serviceChecks.isWooCommerceConfigured() },
    { name: 'Adobe Stock', configured: serviceChecks.isAdobeStockConfigured() },
    { name: 'Email Service', configured: serviceChecks.isEmailConfigured() },
    { name: 'Shipping APIs', configured: serviceChecks.isShippingConfigured() },
  ]
  
  console.log('\n🔍 Service Configuration Status:')
  checks.forEach(check => {
    const status = check.configured ? '✅' : '❌'
    const message = check.configured ? 'Configured' : 'Not configured'
    console.log(`  ${status} ${check.name}: ${message}`)
  })
  console.log('')
  
  return checks
}