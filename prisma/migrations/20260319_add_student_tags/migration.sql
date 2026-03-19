-- CreateTable
CREATE TABLE "StudentTag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'gray',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentTagAssignment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "assignedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentTagAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentTag_name_key" ON "StudentTag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "StudentTagAssignment_studentId_tagId_key" ON "StudentTagAssignment"("studentId", "tagId");

-- CreateIndex
CREATE INDEX "StudentTagAssignment_studentId_idx" ON "StudentTagAssignment"("studentId");

-- CreateIndex
CREATE INDEX "StudentTagAssignment_tagId_idx" ON "StudentTagAssignment"("tagId");

-- AddForeignKey
ALTER TABLE "StudentTagAssignment" ADD CONSTRAINT "StudentTagAssignment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentTagAssignment" ADD CONSTRAINT "StudentTagAssignment_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "StudentTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
