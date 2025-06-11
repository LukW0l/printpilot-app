-- CreateTable
CREATE TABLE "production_cost_config" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "thinStretcherPrice" DECIMAL NOT NULL DEFAULT 1.0,
    "thickStretcherPrice" DECIMAL NOT NULL DEFAULT 1.5,
    "crossbarPrice" DECIMAL NOT NULL DEFAULT 1.0,
    "canvasPricePerM2" DECIMAL NOT NULL DEFAULT 25.0,
    "printingPricePerM2" DECIMAL NOT NULL DEFAULT 15.0,
    "framingPrice" DECIMAL NOT NULL DEFAULT 10.0,
    "hookPrice" DECIMAL NOT NULL DEFAULT 1.0,
    "cardboardPrice" DECIMAL NOT NULL DEFAULT 1.0,
    "wholesaleMarkup" DECIMAL NOT NULL DEFAULT 100.0,
    "marginPercentage" DECIMAL NOT NULL DEFAULT 20.0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "cardboard_inventory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL,
    "minStock" INTEGER NOT NULL DEFAULT 10,
    "price" DECIMAL NOT NULL DEFAULT 1.0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "production_costs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderItemId" TEXT NOT NULL,
    "stretcherCost" DECIMAL NOT NULL DEFAULT 0,
    "crossbarCost" DECIMAL NOT NULL DEFAULT 0,
    "canvasCost" DECIMAL NOT NULL DEFAULT 0,
    "printingCost" DECIMAL NOT NULL DEFAULT 0,
    "framingCost" DECIMAL NOT NULL DEFAULT 0,
    "cardboardCost" DECIMAL NOT NULL DEFAULT 0,
    "hookCost" DECIMAL NOT NULL DEFAULT 0,
    "totalMaterialCost" DECIMAL NOT NULL DEFAULT 0,
    "wholesalePrice" DECIMAL NOT NULL DEFAULT 0,
    "finalPrice" DECIMAL NOT NULL DEFAULT 0,
    "profit" DECIMAL NOT NULL DEFAULT 0,
    "configId" TEXT,
    "includeCardboard" BOOLEAN NOT NULL DEFAULT true,
    "includeHook" BOOLEAN NOT NULL DEFAULT true,
    "includeFraming" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "production_costs_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_items" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "production_costs_configId_fkey" FOREIGN KEY ("configId") REFERENCES "production_cost_config" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "cardboard_inventory_width_height_key" ON "cardboard_inventory"("width", "height");

-- CreateIndex
CREATE UNIQUE INDEX "production_costs_orderItemId_key" ON "production_costs"("orderItemId");
