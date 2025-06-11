-- AlterTable
ALTER TABLE "suppliers" ADD COLUMN "crossbarPricePerMeter" DECIMAL;
ALTER TABLE "suppliers" ADD COLUMN "materialMargin" REAL DEFAULT 0;
ALTER TABLE "suppliers" ADD COLUMN "thickStripPricePerMeter" DECIMAL;
ALTER TABLE "suppliers" ADD COLUMN "thinStripPricePerMeter" DECIMAL;

-- CreateTable
CREATE TABLE "frame_kits" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "frameType" TEXT NOT NULL,
    "crossbars" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "frame_kits_width_height_frameType_crossbars_key" ON "frame_kits"("width", "height", "frameType", "crossbars");
