-- AlterTable: Add adminId column to NavbarPreset for per-admin presets
-- First add as nullable, assign existing presets to the first ADMIN user, then make required

-- Step 1: Add nullable adminId column
ALTER TABLE "NavbarPreset" ADD COLUMN "adminId" TEXT;

-- Step 2: Assign existing presets to the first admin user found
UPDATE "NavbarPreset"
SET "adminId" = (SELECT "id" FROM "User" WHERE "role" = 'ADMIN' ORDER BY "createdAt" ASC LIMIT 1)
WHERE "adminId" IS NULL;

-- Step 3: Delete any presets that couldn't be assigned (no admin users exist)
DELETE FROM "NavbarPreset" WHERE "adminId" IS NULL;

-- Step 4: Make adminId required
ALTER TABLE "NavbarPreset" ALTER COLUMN "adminId" SET NOT NULL;

-- Step 5: Add foreign key constraint
ALTER TABLE "NavbarPreset" ADD CONSTRAINT "NavbarPreset_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 6: Add index on adminId for efficient filtering
CREATE INDEX "NavbarPreset_adminId_idx" ON "NavbarPreset"("adminId");
