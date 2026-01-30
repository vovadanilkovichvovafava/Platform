-- Add shortCode column to TelegramLinkToken for manual connection flow
-- First, delete any existing pending tokens (they will be regenerated with the new schema)
DELETE FROM "TelegramLinkToken";

-- Add the shortCode column (NOT NULL with UNIQUE constraint)
ALTER TABLE "TelegramLinkToken" ADD COLUMN "shortCode" TEXT NOT NULL;

-- Create unique index for shortCode
CREATE UNIQUE INDEX "TelegramLinkToken_shortCode_key" ON "TelegramLinkToken"("shortCode");

-- Create search index for shortCode
CREATE INDEX "TelegramLinkToken_shortCode_idx" ON "TelegramLinkToken"("shortCode");
