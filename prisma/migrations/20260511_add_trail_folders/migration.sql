-- CreateTable
CREATE TABLE "TrailFolder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrailFolder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrailFolder_order_idx" ON "TrailFolder"("order");

-- AlterTable
ALTER TABLE "Trail" ADD COLUMN "folderId" TEXT;

-- CreateIndex
CREATE INDEX "Trail_folderId_idx" ON "Trail"("folderId");

-- AddForeignKey
ALTER TABLE "Trail" ADD CONSTRAINT "Trail_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "TrailFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
