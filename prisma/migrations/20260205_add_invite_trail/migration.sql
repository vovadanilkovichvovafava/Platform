-- CreateTable
CREATE TABLE "InviteTrail" (
    "id" TEXT NOT NULL,
    "inviteId" TEXT NOT NULL,
    "trailId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InviteTrail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InviteTrail_inviteId_idx" ON "InviteTrail"("inviteId");

-- CreateIndex
CREATE INDEX "InviteTrail_trailId_idx" ON "InviteTrail"("trailId");

-- CreateIndex
CREATE UNIQUE INDEX "InviteTrail_inviteId_trailId_key" ON "InviteTrail"("inviteId", "trailId");

-- AddForeignKey
ALTER TABLE "InviteTrail" ADD CONSTRAINT "InviteTrail_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "Invite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteTrail" ADD CONSTRAINT "InviteTrail_trailId_fkey" FOREIGN KEY ("trailId") REFERENCES "Trail"("id") ON DELETE CASCADE ON UPDATE CASCADE;
