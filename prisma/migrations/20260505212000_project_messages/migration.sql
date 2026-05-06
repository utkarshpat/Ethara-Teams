-- CreateTable
CREATE TABLE "ProjectMessage" (
    "id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectMessage_projectId_idx" ON "ProjectMessage"("projectId");

-- CreateIndex
CREATE INDEX "ProjectMessage_userId_idx" ON "ProjectMessage"("userId");

-- CreateIndex
CREATE INDEX "ProjectMessage_createdAt_idx" ON "ProjectMessage"("createdAt");

-- AddForeignKey
ALTER TABLE "ProjectMessage" ADD CONSTRAINT "ProjectMessage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMessage" ADD CONSTRAINT "ProjectMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
