-- Lab 4 Issue 28: additive Actions Taken foundation.
CREATE TYPE "ActionStatus" AS ENUM ('DRAFT', 'COMPLETED', 'CANCELLED');

ALTER TABLE "Ticket" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Ticket" ADD COLUMN "resolvedAt" TIMESTAMP(3);

CREATE TABLE "ActionTaken" (
  "id" SERIAL NOT NULL,
  "ticketId" INTEGER NOT NULL,
  "actionDateTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actionDescription" TEXT NOT NULL,
  "result" TEXT,
  "createdById" INTEGER NOT NULL,
  "performedById" INTEGER,
  "assignedToUserId" INTEGER,
  "status" "ActionStatus" NOT NULL DEFAULT 'DRAFT',
  "followUpRequired" BOOLEAN NOT NULL,
  "followUpNote" TEXT,
  "attachmentNotes" TEXT,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "version" INTEGER NOT NULL DEFAULT 1,
  "requestKey" TEXT NOT NULL,
  CONSTRAINT "ActionTaken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ActionTaken_ticketId_createdById_requestKey_key" ON "ActionTaken"("ticketId", "createdById", "requestKey");
CREATE INDEX "ActionTaken_ticketId_actionDateTime_id_idx" ON "ActionTaken"("ticketId", "actionDateTime", "id");
CREATE INDEX "ActionTaken_performedById_completedAt_id_idx" ON "ActionTaken"("performedById", "completedAt", "id");

ALTER TABLE "ActionTaken" ADD CONSTRAINT "ActionTaken_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActionTaken" ADD CONSTRAINT "ActionTaken_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActionTaken" ADD CONSTRAINT "ActionTaken_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActionTaken" ADD CONSTRAINT "ActionTaken_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
