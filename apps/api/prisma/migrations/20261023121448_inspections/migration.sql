-- CreateEnum
CREATE TYPE "Compliance" AS ENUM ('COMPLIANT', 'NON_COMPLIANT');

-- CreateEnum
CREATE TYPE "InspectionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'RETURNED');

-- CreateTable
CREATE TABLE "inspections" (
    "id" TEXT NOT NULL,
    "constructionSiteId" TEXT NOT NULL,
    "inspectorId" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "compliance" "Compliance" NOT NULL,
    "status" "InspectionStatus" NOT NULL DEFAULT 'DRAFT',
    "returnReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photos" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,

    CONSTRAINT "photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_status_history" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "from" "InspectionStatus",
    "to" "InspectionStatus" NOT NULL,
    "userId" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspection_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inspections_constructionSiteId_status_idx" ON "inspections"("constructionSiteId", "status");

-- CreateIndex
CREATE INDEX "inspections_inspectorId_idx" ON "inspections"("inspectorId");

-- CreateIndex
CREATE UNIQUE INDEX "photos_key_key" ON "photos"("key");

-- CreateIndex
CREATE INDEX "photos_inspectionId_idx" ON "photos"("inspectionId");

-- CreateIndex
CREATE INDEX "inspection_status_history_inspectionId_at_idx" ON "inspection_status_history"("inspectionId", "at");

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_constructionSiteId_fkey" FOREIGN KEY ("constructionSiteId") REFERENCES "construction_sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_inspectorId_fkey" FOREIGN KEY ("inspectorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_status_history" ADD CONSTRAINT "inspection_status_history_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_status_history" ADD CONSTRAINT "inspection_status_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
