ALTER TABLE "Ticket" ADD COLUMN "requesterResolutionIndicatedAt" TIMESTAMP(3);
ALTER TABLE "Ticket" ADD COLUMN "requesterResolutionIndicatedByUserId" INTEGER;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_requesterResolutionIndicatedByUserId_fkey" FOREIGN KEY ("requesterResolutionIndicatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
