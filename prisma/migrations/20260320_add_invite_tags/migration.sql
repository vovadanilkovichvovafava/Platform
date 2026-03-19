-- CreateTable
CREATE TABLE "InviteTag" (
    "id" TEXT NOT NULL,
    "inviteId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InviteTag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InviteTag_inviteId_tagId_key" ON "InviteTag"("inviteId", "tagId");

-- CreateIndex
CREATE INDEX "InviteTag_inviteId_idx" ON "InviteTag"("inviteId");

-- CreateIndex
CREATE INDEX "InviteTag_tagId_idx" ON "InviteTag"("tagId");

-- AddForeignKey
ALTER TABLE "InviteTag" ADD CONSTRAINT "InviteTag_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "Invite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteTag" ADD CONSTRAINT "InviteTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "StudentTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
