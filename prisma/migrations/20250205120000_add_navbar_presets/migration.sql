-- CreateTable
CREATE TABLE "NavbarPreset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NavbarPreset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NavbarItem" (
    "id" TEXT NOT NULL,
    "presetId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "visibleTo" TEXT NOT NULL DEFAULT '["STUDENT","TEACHER","CO_ADMIN","ADMIN"]',

    CONSTRAINT "NavbarItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NavbarPreset_isActive_idx" ON "NavbarPreset"("isActive");

-- CreateIndex
CREATE INDEX "NavbarItem_presetId_idx" ON "NavbarItem"("presetId");

-- CreateIndex
CREATE INDEX "NavbarItem_order_idx" ON "NavbarItem"("order");

-- AddForeignKey
ALTER TABLE "NavbarItem" ADD CONSTRAINT "NavbarItem_presetId_fkey" FOREIGN KEY ("presetId") REFERENCES "NavbarPreset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
