-- AlterTable
ALTER TABLE "orders" ADD COLUMN "paidAt" DATETIME;
ALTER TABLE "orders" ADD COLUMN "paymentMethod" TEXT;
ALTER TABLE "orders" ADD COLUMN "shippingCost" DECIMAL;

-- CreateTable
CREATE TABLE "shipments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "trackingNumber" TEXT NOT NULL,
    "carrierTrackingNumber" TEXT,
    "recipientName" TEXT NOT NULL,
    "recipientAddress" TEXT NOT NULL,
    "senderAddress" TEXT,
    "weight" DECIMAL NOT NULL,
    "dimensions" TEXT NOT NULL,
    "insuranceValue" DECIMAL NOT NULL DEFAULT 0,
    "shippingCost" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PLN',
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "providerOrderId" TEXT,
    "providerResponse" TEXT,
    "labelUrl" TEXT,
    "pickupType" TEXT,
    "pickupDate" DATETIME,
    "pickupTimeFrom" TEXT,
    "pickupTimeTo" TEXT,
    "estimatedDelivery" DATETIME,
    "actualDelivery" DATETIME,
    "deliveryAttempts" INTEGER NOT NULL DEFAULT 0,
    "codAmount" DECIMAL,
    "codEnabled" BOOLEAN NOT NULL DEFAULT false,
    "saturdayDelivery" BOOLEAN NOT NULL DEFAULT false,
    "priorityDelivery" BOOLEAN NOT NULL DEFAULT false,
    "smsNotifications" BOOLEAN NOT NULL DEFAULT false,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT false,
    "errorMessage" TEXT,
    "errorDetails" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "shipments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
