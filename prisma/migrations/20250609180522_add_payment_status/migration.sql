-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT,
    "shippingAddress" TEXT NOT NULL,
    "billingAddress" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "totalAmount" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PLN',
    "trackingNumber" TEXT,
    "shippingProvider" TEXT,
    "orderDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "orders_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_orders" ("billingAddress", "createdAt", "currency", "customerEmail", "customerName", "customerPhone", "externalId", "id", "orderDate", "shippingAddress", "shippingProvider", "shopId", "status", "totalAmount", "trackingNumber", "updatedAt") SELECT "billingAddress", "createdAt", "currency", "customerEmail", "customerName", "customerPhone", "externalId", "id", "orderDate", "shippingAddress", "shippingProvider", "shopId", "status", "totalAmount", "trackingNumber", "updatedAt" FROM "orders";
DROP TABLE "orders";
ALTER TABLE "new_orders" RENAME TO "orders";
CREATE UNIQUE INDEX "orders_externalId_shopId_key" ON "orders"("externalId", "shopId");
CREATE TABLE "new_system_config" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyName" TEXT,
    "companyLogo" TEXT,
    "companyEmail" TEXT,
    "companyPhone" TEXT,
    "companyAddress" TEXT,
    "companyNip" TEXT,
    "companyRegon" TEXT,
    "companyWebsite" TEXT,
    "defaultCurrency" TEXT NOT NULL DEFAULT 'PLN',
    "defaultTimezone" TEXT NOT NULL DEFAULT 'Europe/Warsaw',
    "businessHours" TEXT,
    "workingDays" TEXT,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 10,
    "orderVolumeAlert" INTEGER NOT NULL DEFAULT 50,
    "notificationFrequency" TEXT NOT NULL DEFAULT 'REAL_TIME',
    "autoReorderEnabled" BOOLEAN NOT NULL DEFAULT false,
    "reorderLeadDays" INTEGER NOT NULL DEFAULT 7,
    "safetyStockPercent" INTEGER NOT NULL DEFAULT 20,
    "defaultSenderName" TEXT,
    "defaultSenderAddress" TEXT,
    "shippingMarkup" DECIMAL NOT NULL DEFAULT 0,
    "freeShippingThreshold" DECIMAL,
    "apaczkaAppId" TEXT,
    "apaczkaApiKey" TEXT,
    "apaczkaTestMode" BOOLEAN NOT NULL DEFAULT false,
    "companyPostalCode" TEXT,
    "furgonetkaClientId" TEXT,
    "furgonetkaClientSecret" TEXT,
    "furgonetkaUsername" TEXT,
    "furgonetkaPassword" TEXT,
    "furgonetkaTestMode" BOOLEAN NOT NULL DEFAULT false,
    "dashboardLayout" TEXT NOT NULL DEFAULT 'DEFAULT',
    "itemsPerPage" INTEGER NOT NULL DEFAULT 20,
    "chartDateRange" INTEGER NOT NULL DEFAULT 30,
    "exportFormat" TEXT NOT NULL DEFAULT 'PDF',
    "adobeStockApiKey" TEXT,
    "adobeStockEnabled" BOOLEAN NOT NULL DEFAULT false,
    "webhookRetryCount" INTEGER NOT NULL DEFAULT 3,
    "syncBatchSize" INTEGER NOT NULL DEFAULT 50,
    "rushOrderSurcharge" DECIMAL NOT NULL DEFAULT 25.0,
    "maxDailyCapacity" INTEGER,
    "productionLeadDays" INTEGER NOT NULL DEFAULT 3,
    "orderConfirmationTemplate" TEXT,
    "shippingNotificationTemplate" TEXT,
    "lowStockEmailTemplate" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#3B82F6',
    "secondaryColor" TEXT NOT NULL DEFAULT '#6B7280',
    "logoPosition" TEXT NOT NULL DEFAULT 'TOP_LEFT',
    "customCss" TEXT,
    "autoBackupEnabled" BOOLEAN NOT NULL DEFAULT true,
    "backupFrequency" TEXT NOT NULL DEFAULT 'WEEKLY',
    "dataRetentionMonths" INTEGER NOT NULL DEFAULT 24,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "lastBackup" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_system_config" ("adobeStockApiKey", "adobeStockEnabled", "apaczkaApiKey", "apaczkaAppId", "apaczkaTestMode", "autoBackupEnabled", "autoReorderEnabled", "backupFrequency", "businessHours", "chartDateRange", "companyAddress", "companyEmail", "companyLogo", "companyName", "companyNip", "companyPhone", "companyPostalCode", "companyRegon", "companyWebsite", "createdAt", "customCss", "dashboardLayout", "dataRetentionMonths", "defaultCurrency", "defaultSenderAddress", "defaultSenderName", "defaultTimezone", "emailNotifications", "exportFormat", "freeShippingThreshold", "id", "isActive", "itemsPerPage", "lastBackup", "logoPosition", "lowStockEmailTemplate", "lowStockThreshold", "maxDailyCapacity", "notificationFrequency", "orderConfirmationTemplate", "orderVolumeAlert", "primaryColor", "productionLeadDays", "reorderLeadDays", "rushOrderSurcharge", "safetyStockPercent", "secondaryColor", "shippingMarkup", "shippingNotificationTemplate", "syncBatchSize", "updatedAt", "version", "webhookRetryCount", "workingDays") SELECT "adobeStockApiKey", "adobeStockEnabled", "apaczkaApiKey", "apaczkaAppId", "apaczkaTestMode", "autoBackupEnabled", "autoReorderEnabled", "backupFrequency", "businessHours", "chartDateRange", "companyAddress", "companyEmail", "companyLogo", "companyName", "companyNip", "companyPhone", "companyPostalCode", "companyRegon", "companyWebsite", "createdAt", "customCss", "dashboardLayout", "dataRetentionMonths", "defaultCurrency", "defaultSenderAddress", "defaultSenderName", "defaultTimezone", "emailNotifications", "exportFormat", "freeShippingThreshold", "id", "isActive", "itemsPerPage", "lastBackup", "logoPosition", "lowStockEmailTemplate", "lowStockThreshold", "maxDailyCapacity", "notificationFrequency", "orderConfirmationTemplate", "orderVolumeAlert", "primaryColor", "productionLeadDays", "reorderLeadDays", "rushOrderSurcharge", "safetyStockPercent", "secondaryColor", "shippingMarkup", "shippingNotificationTemplate", "syncBatchSize", "updatedAt", "version", "webhookRetryCount", "workingDays" FROM "system_config";
DROP TABLE "system_config";
ALTER TABLE "new_system_config" RENAME TO "system_config";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
