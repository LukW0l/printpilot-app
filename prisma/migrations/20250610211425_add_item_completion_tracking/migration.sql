-- CreateTable
CREATE TABLE "item_completions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderItemId" TEXT NOT NULL,
    "productionTimerId" TEXT,
    "operationType" TEXT NOT NULL,
    "completedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "operatorName" TEXT,
    "notes" TEXT,
    CONSTRAINT "item_completions_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_items" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "item_completions_productionTimerId_fkey" FOREIGN KEY ("productionTimerId") REFERENCES "production_timers" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_order_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL NOT NULL,
    "imageUrl" TEXT,
    "productType" TEXT,
    "dimensions" TEXT,
    "printStatus" TEXT NOT NULL DEFAULT 'NOT_PRINTED',
    "printedAt" DATETIME,
    "completedCount" INTEGER NOT NULL DEFAULT 0,
    "completionStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_order_items" ("createdAt", "dimensions", "id", "imageUrl", "name", "orderId", "price", "printStatus", "printedAt", "productType", "quantity", "sku") SELECT "createdAt", "dimensions", "id", "imageUrl", "name", "orderId", "price", "printStatus", "printedAt", "productType", "quantity", "sku" FROM "order_items";
DROP TABLE "order_items";
ALTER TABLE "new_order_items" RENAME TO "order_items";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
