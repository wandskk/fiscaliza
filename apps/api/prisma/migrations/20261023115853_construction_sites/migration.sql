-- Trigram operators for the GIN search indexes below
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateTable
CREATE TABLE "construction_sites" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contract" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "construction_sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_assignments" (
    "constructionSiteId" TEXT NOT NULL,
    "inspectorId" TEXT NOT NULL,

    CONSTRAINT "site_assignments_pkey" PRIMARY KEY ("constructionSiteId","inspectorId")
);

-- CreateIndex
CREATE UNIQUE INDEX "construction_sites_contract_key" ON "construction_sites"("contract");

-- CreateIndex
CREATE INDEX "construction_sites_name_idx" ON "construction_sites" USING GIN ("name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "construction_sites_contract_idx" ON "construction_sites" USING GIN ("contract" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "site_assignments_inspectorId_idx" ON "site_assignments"("inspectorId");

-- AddForeignKey
ALTER TABLE "site_assignments" ADD CONSTRAINT "site_assignments_constructionSiteId_fkey" FOREIGN KEY ("constructionSiteId") REFERENCES "construction_sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_assignments" ADD CONSTRAINT "site_assignments_inspectorId_fkey" FOREIGN KEY ("inspectorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
