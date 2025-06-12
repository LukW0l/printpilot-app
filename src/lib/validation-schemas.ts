import { z } from 'zod'

// Order validation schemas
export const createOrderSchema = z.object({
  externalId: z.string().min(1).max(255),
  shopId: z.string().uuid(),
  customerName: z.string().min(1).max(255),
  customerEmail: z.string().email().max(255),
  totalAmount: z.number().positive(),
  shippingCost: z.number().nonnegative().optional(),
  status: z.enum(['NEW', 'PROCESSING', 'COMPLETED', 'CANCELLED']).optional(),
  orderDate: z.string().datetime().optional(),
  items: z.array(z.object({
    name: z.string().min(1).max(255),
    quantity: z.number().int().positive().max(1000),
    price: z.number().positive(),
    dimensions: z.string().max(100).optional(),
    frame_requirements: z.object({
      width: z.number().positive().max(10000),
      height: z.number().positive().max(10000),
      frameType: z.string().max(100)
    }).optional()
  })).min(1).max(100)
})

export const updateOrderSchema = createOrderSchema.partial()

// User registration schema
export const registerUserSchema = z.object({
  email: z.string().email().max(255),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one lowercase letter, one uppercase letter, and one number'
    ),
  name: z.string().min(1).max(100).trim()
})

// Production timer schemas
export const startTimerSchema = z.object({
  operationType: z.enum(['FRAME_PREP', 'CUTTING', 'PRINTING', 'FRAMING', 'PACKAGING', 'QUALITY_CHECK', 'OTHER']),
  description: z.string().max(500).optional(),
  unitsCount: z.number().int().positive().max(10000),
  operatorName: z.string().max(100).optional(),
  orderId: z.string().uuid().optional(),
  orderItemIds: z.array(z.string().uuid()).max(100).optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
})

export const stopTimerSchema = z.object({
  timerId: z.string().uuid(),
  quality: z.enum(['POOR', 'GOOD', 'EXCELLENT']).optional(),
  notes: z.string().max(1000).optional()
})

// Shop configuration schema
export const shopConfigSchema = z.object({
  name: z.string().min(1).max(255),
  url: z.string().url().max(500),
  consumerKey: z.string().min(1).max(255),
  consumerSecret: z.string().min(1).max(255),
  webhookSecret: z.string().min(1).max(255).optional(),
  isActive: z.boolean().optional()
})

// Production cost configuration schema
export const productionCostConfigSchema = z.object({
  thinStretcherPrice: z.number().nonnegative().max(1000),
  thickStretcherPrice: z.number().nonnegative().max(1000),
  crossbarPrice: z.number().nonnegative().max(1000),
  canvasPricePerM2: z.number().nonnegative().max(10000),
  printingPricePerM2: z.number().nonnegative().max(10000),
  framingPrice: z.number().nonnegative().max(1000),
  hookPrice: z.number().nonnegative().max(100),
  cardboardPrice: z.number().nonnegative().max(1000),
  wholesaleMarkup: z.number().nonnegative().max(1000),
  marginPercentage: z.number().nonnegative().max(1000),
  hourlyLaborRate: z.number().nonnegative().max(1000).optional(),
  estimatedTimePerItem: z.number().nonnegative().max(100).optional(),
  packagingCostPerOrder: z.number().nonnegative().max(1000).optional(),
  processingFeePercentage: z.number().nonnegative().max(100).optional(),
  shippingCostPercentage: z.number().nonnegative().max(100).optional()
})

// Supplier schema
export const supplierSchema = z.object({
  name: z.string().min(1, "Supplier name is required").max(255),
  contactPerson: z.string().max(255).optional(),
  email: z.string().email("Valid email is required").max(255),
  phone: z.string().max(50).optional(),
  website: z.string().url("Must be a valid URL").max(500).optional(),
  address: z.string().min(1, "Address is required").max(500),
  city: z.string().min(1, "City is required").max(100),
  postalCode: z.string().min(1, "Postal code is required").max(20),
  country: z.string().min(2, "Country is required").max(10),
  category: z.enum(['FRAMES', 'CANVAS', 'PRINTING', 'PACKAGING', 'SHIPPING', 'OTHER']),
  paymentTerms: z.string().max(255).optional(),
  deliveryTime: z.number().int().min(1).max(365).optional(),
  minimumOrderValue: z.number().nonnegative().max(1000000).optional(),
  rating: z.number().min(0).max(5).default(5),
  reliability: z.number().min(0).max(5).default(5),
  qualityRating: z.number().min(0).max(5).default(5),
  isActive: z.boolean().default(true),
  isPreferred: z.boolean().default(false),
  thinStripPricePerMeter: z.number().nonnegative().max(1000).optional(),
  thickStripPricePerMeter: z.number().nonnegative().max(1000).optional(),
  crossbarPricePerMeter: z.number().nonnegative().max(1000).optional(),
  materialMargin: z.number().nonnegative().max(100).optional()
})

// Supplier product schema
export const supplierProductSchema = z.object({
  supplierId: z.string().cuid("Invalid supplier ID"),
  name: z.string().min(1, "Product name is required").max(255),
  sku: z.string().max(100).optional(),
  category: z.string().min(1, "Category is required").max(100),
  width: z.number().int().positive().max(10000).optional(),
  height: z.number().int().positive().max(10000).optional(),
  thickness: z.number().int().positive().max(1000).optional(),
  unitPrice: z.number().positive("Unit price must be positive").max(1000000),
  currency: z.string().length(3, "Currency must be 3 characters").default("PLN"),
  minimumQuantity: z.number().int().positive().max(10000).default(1),
  bulkPrice: z.number().positive().max(1000000).optional(),
  bulkMinQuantity: z.number().int().positive().max(10000).optional(),
  inStock: z.boolean().default(true),
  leadTime: z.number().int().nonnegative().max(365).optional()
})

// Supplier order schema
export const supplierOrderSchema = z.object({
  supplierId: z.string().cuid("Invalid supplier ID"),
  items: z.array(z.object({
    productId: z.string().cuid("Invalid product ID"),
    quantity: z.number().int().positive("Quantity must be positive").max(10000),
    unitPrice: z.number().positive().max(1000000).optional()
  })).min(1, "At least one item is required").max(100),
  notes: z.string().max(1000).optional(),
  expectedDelivery: z.string().datetime().optional()
})

// Shipping calculation schema
export const calculateShippingSchema = z.object({
  serviceId: z.string().max(100),
  dimensions: z.object({
    length: z.number().positive().max(1000),
    width: z.number().positive().max(1000),
    height: z.number().positive().max(1000),
    weight: z.number().positive().max(1000)
  }),
  fromAddress: z.object({
    postalCode: z.string().max(20),
    city: z.string().max(100),
    country: z.string().length(2) // ISO country code
  }),
  toAddress: z.object({
    postalCode: z.string().max(20),
    city: z.string().max(100),
    country: z.string().length(2)
  }),
  value: z.number().positive().max(1000000).optional()
})

// Query parameter schemas
export const paginationSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().max(100)).optional(),
  search: z.string().max(255).optional(),
  status: z.string().max(50).optional(),
  sortBy: z.string().max(100).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
})

// Webhook validation schema
export const webhookDataSchema = z.object({
  id: z.number().int().positive(),
  status: z.string().max(100),
  total: z.string().regex(/^\d+(\.\d{2})?$/),
  shipping_total: z.string().regex(/^\d+(\.\d{2})?$/).optional(),
  date_created: z.string(),
  billing: z.object({
    first_name: z.string().max(100),
    last_name: z.string().max(100),
    email: z.string().email().max(255)
  }),
  line_items: z.array(z.object({
    id: z.number().int().positive(),
    name: z.string().max(255),
    quantity: z.number().int().positive(),
    price: z.number().nonnegative(),
    meta_data: z.array(z.any()).optional()
  }))
})

// Authentication and authorization schemas
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters")
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password too long")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one lowercase letter, one uppercase letter, and one number"
    ),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
})

// API action schemas for better validation
export const apiActionSchema = z.object({
  action: z.string().min(1, "Action is required")
})

// Common ID validation
export const idParamSchema = z.object({
  id: z.string().cuid("Invalid ID format")
})

// Environment variable validation schema
export const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "Database URL is required"),
  NEXTAUTH_SECRET: z.string().min(32, "NextAuth secret must be at least 32 characters"),
  NEXTAUTH_URL: z.string().url("NextAuth URL must be valid").optional()
})

// Generic response schema
export const apiResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  error: z.string().optional(),
  data: z.any().optional(),
  count: z.number().optional()
})

// Type exports
export type CreateOrderData = z.infer<typeof createOrderSchema>
export type UpdateOrderData = z.infer<typeof updateOrderSchema>
export type RegisterUserData = z.infer<typeof registerUserSchema>
export type LoginData = z.infer<typeof loginSchema>
export type ChangePasswordData = z.infer<typeof changePasswordSchema>
export type StartTimerData = z.infer<typeof startTimerSchema>
export type StopTimerData = z.infer<typeof stopTimerSchema>
export type ShopConfigData = z.infer<typeof shopConfigSchema>
export type ProductionCostConfigData = z.infer<typeof productionCostConfigSchema>
export type SupplierData = z.infer<typeof supplierSchema>
export type SupplierProductData = z.infer<typeof supplierProductSchema>
export type SupplierOrderData = z.infer<typeof supplierOrderSchema>
export type CalculateShippingData = z.infer<typeof calculateShippingSchema>
export type PaginationParams = z.infer<typeof paginationSchema>
export type WebhookData = z.infer<typeof webhookDataSchema>
export type ApiActionData = z.infer<typeof apiActionSchema>
export type IdParamData = z.infer<typeof idParamSchema>
export type EnvData = z.infer<typeof envSchema>
export type ApiResponseData = z.infer<typeof apiResponseSchema>