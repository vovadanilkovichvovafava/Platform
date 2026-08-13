-- CreateTable
CREATE TABLE "ModuleContentBlock" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT,
    "title" TEXT,
    "description" TEXT,
    "content" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModuleContentBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ModuleContentBlock_moduleId_idx" ON "ModuleContentBlock"("moduleId");

-- CreateIndex
CREATE INDEX "ModuleContentBlock_moduleId_order_idx" ON "ModuleContentBlock"("moduleId", "order");

-- AddForeignKey
ALTER TABLE "ModuleContentBlock" ADD CONSTRAINT "ModuleContentBlock_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;
