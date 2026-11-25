CREATE TYPE "AranIdeaStatus" AS ENUM ('NEW', 'REVIEWING', 'PLANNED', 'REJECTED', 'IMPLEMENTED');

CREATE TABLE "AranIdea" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "AranIdeaStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "AranIdea_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AranIdea_status_createdAt_idx" ON "AranIdea"("status", "createdAt");
CREATE INDEX "AranIdea_createdById_idx" ON "AranIdea"("createdById");

ALTER TABLE "AranIdea"
ADD CONSTRAINT "AranIdea_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;