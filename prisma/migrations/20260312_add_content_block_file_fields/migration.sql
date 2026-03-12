-- AlterTable: add file upload fields to ModuleContentBlock
ALTER TABLE "ModuleContentBlock" ADD COLUMN "fileKey" TEXT;
ALTER TABLE "ModuleContentBlock" ADD COLUMN "fileName" TEXT;
ALTER TABLE "ModuleContentBlock" ADD COLUMN "fileSize" INTEGER;
ALTER TABLE "ModuleContentBlock" ADD COLUMN "mimeType" TEXT;
