ALTER TABLE "GroupCallParticipant"
ADD COLUMN "raisedHandAt" TIMESTAMP(3);

CREATE TABLE "GroupCallBoardEvent" (
    "id" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "position" SERIAL NOT NULL,
    "senderConnectionId" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GroupCallBoardEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GroupCallBoardEvent_position_key" ON "GroupCallBoardEvent"("position");
CREATE INDEX "GroupCallBoardEvent_callId_position_idx" ON "GroupCallBoardEvent"("callId", "position");

ALTER TABLE "GroupCallBoardEvent"
ADD CONSTRAINT "GroupCallBoardEvent_callId_fkey"
FOREIGN KEY ("callId") REFERENCES "GroupCall"("id") ON DELETE CASCADE ON UPDATE CASCADE;