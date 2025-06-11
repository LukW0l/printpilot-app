-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_production_cost_config" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "thinStretcherPrice" DECIMAL NOT NULL DEFAULT 1.0,
    "thickStretcherPrice" DECIMAL NOT NULL DEFAULT 1.5,
    "crossbarPrice" DECIMAL NOT NULL DEFAULT 1.0,
    "canvasPricePerM2" DECIMAL NOT NULL DEFAULT 25.0,
    "printingPricePerM2" DECIMAL NOT NULL DEFAULT 15.0,
    "externalPrintingPricePerM2" DECIMAL NOT NULL DEFAULT 18.0,
    "useExternalPrintingDefault" BOOLEAN NOT NULL DEFAULT true,
    "printerPurchaseCost" DECIMAL NOT NULL DEFAULT 15000.0,
    "printerMonthlyMaintenance" DECIMAL NOT NULL DEFAULT 500.0,
    "printerLifespanMonths" INTEGER NOT NULL DEFAULT 36,
    "framingPrice" DECIMAL NOT NULL DEFAULT 10.0,
    "hookPrice" DECIMAL NOT NULL DEFAULT 1.0,
    "cardboardPrice" DECIMAL NOT NULL DEFAULT 1.0,
    "wholesaleMarkup" DECIMAL NOT NULL DEFAULT 100.0,
    "marginPercentage" DECIMAL NOT NULL DEFAULT 20.0,
    "hourlyLaborRate" DECIMAL NOT NULL DEFAULT 50.0,
    "estimatedTimePerItem" DECIMAL NOT NULL DEFAULT 0.5,
    "packagingCostPerOrder" DECIMAL NOT NULL DEFAULT 5.0,
    "processingFeePercentage" DECIMAL NOT NULL DEFAULT 2.0,
    "shippingCostPercentage" DECIMAL NOT NULL DEFAULT 80.0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_production_cost_config" ("canvasPricePerM2", "cardboardPrice", "createdAt", "crossbarPrice", "estimatedTimePerItem", "framingPrice", "hookPrice", "hourlyLaborRate", "id", "isActive", "marginPercentage", "packagingCostPerOrder", "printingPricePerM2", "processingFeePercentage", "shippingCostPercentage", "thickStretcherPrice", "thinStretcherPrice", "updatedAt", "wholesaleMarkup") SELECT "canvasPricePerM2", "cardboardPrice", "createdAt", "crossbarPrice", "estimatedTimePerItem", "framingPrice", "hookPrice", "hourlyLaborRate", "id", "isActive", "marginPercentage", "packagingCostPerOrder", "printingPricePerM2", "processingFeePercentage", "shippingCostPercentage", "thickStretcherPrice", "thinStretcherPrice", "updatedAt", "wholesaleMarkup" FROM "production_cost_config";
DROP TABLE "production_cost_config";
ALTER TABLE "new_production_cost_config" RENAME TO "production_cost_config";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
