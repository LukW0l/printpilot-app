-- CreateTable
CREATE TABLE "demand_forecasts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "frameWidth" INTEGER NOT NULL,
    "frameHeight" INTEGER NOT NULL,
    "productType" TEXT NOT NULL,
    "weekOfYear" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "historicalDemand" INTEGER NOT NULL,
    "forecastedDemand" INTEGER NOT NULL,
    "confidence" REAL NOT NULL DEFAULT 0.8,
    "seasonalityFactor" REAL NOT NULL DEFAULT 1.0,
    "calculatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastOrderDate" DATETIME,
    "averageWeeklyDemand" REAL NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "contactPerson" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "website" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'PL',
    "category" TEXT NOT NULL,
    "paymentTerms" TEXT,
    "deliveryTime" INTEGER,
    "minimumOrderValue" DECIMAL,
    "rating" REAL NOT NULL DEFAULT 0,
    "reliability" REAL NOT NULL DEFAULT 0,
    "qualityRating" REAL NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPreferred" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "supplier_products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "supplierId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "category" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "thickness" INTEGER,
    "unitPrice" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PLN',
    "minimumQuantity" INTEGER NOT NULL DEFAULT 1,
    "bulkPrice" DECIMAL,
    "bulkMinQuantity" INTEGER,
    "inStock" BOOLEAN NOT NULL DEFAULT true,
    "leadTime" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "supplier_products_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "supplier_orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "supplierId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "totalAmount" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PLN',
    "orderDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedDelivery" DATETIME,
    "actualDelivery" DATETIME,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "paidAt" DATETIME,
    "notes" TEXT,
    "internalNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "supplier_orders_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "supplier_order_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL NOT NULL,
    "totalPrice" DECIMAL NOT NULL,
    "received" BOOLEAN NOT NULL DEFAULT false,
    "receivedQuantity" INTEGER NOT NULL DEFAULT 0,
    "receivedAt" DATETIME,
    CONSTRAINT "supplier_order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "supplier_orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "supplier_order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "supplier_products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "production_timers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT,
    "orderItemId" TEXT,
    "operationType" TEXT NOT NULL,
    "description" TEXT,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME,
    "duration" INTEGER,
    "pausedDuration" INTEGER NOT NULL DEFAULT 0,
    "unitsCount" INTEGER NOT NULL DEFAULT 1,
    "timePerUnit" REAL,
    "operatorName" TEXT,
    "operatorId" TEXT,
    "difficulty" TEXT NOT NULL DEFAULT 'MEDIUM',
    "quality" TEXT NOT NULL DEFAULT 'GOOD',
    "notes" TEXT,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "production_timers_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "production_timers_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_items" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "order_profitability" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "revenue" DECIMAL NOT NULL,
    "shippingRevenue" DECIMAL NOT NULL DEFAULT 0,
    "materialCosts" DECIMAL NOT NULL DEFAULT 0,
    "frameCosts" DECIMAL NOT NULL DEFAULT 0,
    "printingCosts" DECIMAL NOT NULL DEFAULT 0,
    "packagingCosts" DECIMAL NOT NULL DEFAULT 0,
    "laborCosts" DECIMAL NOT NULL DEFAULT 0,
    "laborHours" REAL NOT NULL DEFAULT 0,
    "hourlyRate" DECIMAL NOT NULL DEFAULT 50,
    "shippingCosts" DECIMAL NOT NULL DEFAULT 0,
    "processingFees" DECIMAL NOT NULL DEFAULT 0,
    "overheadCosts" DECIMAL NOT NULL DEFAULT 0,
    "totalCosts" DECIMAL NOT NULL DEFAULT 0,
    "grossProfit" DECIMAL NOT NULL DEFAULT 0,
    "profitMargin" REAL NOT NULL DEFAULT 0,
    "calculatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "order_profitability_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "production_plans" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planDate" DATETIME NOT NULL,
    "shift" TEXT NOT NULL DEFAULT 'DAY',
    "availableHours" REAL NOT NULL DEFAULT 8,
    "workersCount" INTEGER NOT NULL DEFAULT 1,
    "capacity" INTEGER NOT NULL DEFAULT 20,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "plannedItems" INTEGER NOT NULL DEFAULT 0,
    "completedItems" INTEGER NOT NULL DEFAULT 0,
    "efficiency" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "production_tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "sequence" INTEGER NOT NULL,
    "estimatedTime" INTEGER NOT NULL,
    "actualTime" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "assignedTo" TEXT,
    "assignedAt" DATETIME,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "notes" TEXT,
    "issues" TEXT,
    CONSTRAINT "production_tasks_planId_fkey" FOREIGN KEY ("planId") REFERENCES "production_plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "production_tasks_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "production_tasks_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "inventory_alerts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemType" TEXT NOT NULL,
    "itemId" TEXT,
    "alertType" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "message" TEXT NOT NULL,
    "description" TEXT,
    "currentStock" INTEGER,
    "minimumStock" INTEGER,
    "forecastedNeed" INTEGER,
    "shortageDate" DATETIME,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" DATETIME,
    "resolvedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "demand_forecasts_frameWidth_frameHeight_productType_weekOfYear_year_key" ON "demand_forecasts"("frameWidth", "frameHeight", "productType", "weekOfYear", "year");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_orders_orderNumber_key" ON "supplier_orders"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "order_profitability_orderId_key" ON "order_profitability"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "production_plans_planDate_shift_key" ON "production_plans"("planDate", "shift");
