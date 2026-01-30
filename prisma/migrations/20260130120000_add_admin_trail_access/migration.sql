-- CreateTable: AdminTrailAccess
-- Grant specific ADMINs access to specific trails (SUPER_ADMIN has access to all)
-- This migration adds support for SUPER_ADMIN role and admin trail scoping

CREATE TABLE "AdminTrailAccess" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "trailId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminTrailAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminTrailAccess_adminId_idx" ON "AdminTrailAccess"("adminId");

-- CreateIndex
CREATE INDEX "AdminTrailAccess_trailId_idx" ON "AdminTrailAccess"("trailId");

-- CreateIndex (unique constraint)
CREATE UNIQUE INDEX "AdminTrailAccess_adminId_trailId_key" ON "AdminTrailAccess"("adminId", "trailId");

-- AddForeignKey
ALTER TABLE "AdminTrailAccess" ADD CONSTRAINT "AdminTrailAccess_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminTrailAccess" ADD CONSTRAINT "AdminTrailAccess_trailId_fkey" FOREIGN KEY ("trailId") REFERENCES "Trail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Note: Role SUPER_ADMIN is just a string value in User.role field
-- No schema change needed for that, just code-level handling
