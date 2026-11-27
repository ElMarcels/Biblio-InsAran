CREATE TYPE "GroupMemberRole" AS ENUM ('OWNER', 'MEMBER');
CREATE TYPE "GroupInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GroupMember" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT,
    "readerId" TEXT,
    "role" "GroupMemberRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GroupMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GroupInvitation" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "invitedByUserId" TEXT,
    "invitedByReaderId" TEXT,
    "invitedByName" TEXT NOT NULL,
    "invitedUserId" TEXT,
    "invitedReaderId" TEXT,
    "status" "GroupInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    CONSTRAINT "GroupInvitation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GroupMessage" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "senderUserId" TEXT,
    "senderReaderId" TEXT,
    "senderName" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GroupMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GroupCall" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "startedByUserId" TEXT,
    "startedByReaderId" TEXT,
    "startedByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    CONSTRAINT "GroupCall_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GroupCallParticipant" (
    "id" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "userId" TEXT,
    "readerId" TEXT,
    "displayName" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    CONSTRAINT "GroupCallParticipant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GroupCallSignal" (
    "id" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "fromConnectionId" TEXT NOT NULL,
    "toConnectionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GroupCallSignal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GroupMember_groupId_userId_key" ON "GroupMember"("groupId", "userId");
CREATE UNIQUE INDEX "GroupMember_groupId_readerId_key" ON "GroupMember"("groupId", "readerId");
CREATE INDEX "GroupMember_userId_idx" ON "GroupMember"("userId");
CREATE INDEX "GroupMember_readerId_idx" ON "GroupMember"("readerId");
CREATE INDEX "Group_createdAt_idx" ON "Group"("createdAt");
CREATE INDEX "GroupInvitation_invitedUserId_status_idx" ON "GroupInvitation"("invitedUserId", "status");
CREATE INDEX "GroupInvitation_invitedReaderId_status_idx" ON "GroupInvitation"("invitedReaderId", "status");
CREATE INDEX "GroupInvitation_groupId_status_idx" ON "GroupInvitation"("groupId", "status");
CREATE INDEX "GroupMessage_groupId_createdAt_idx" ON "GroupMessage"("groupId", "createdAt");
CREATE INDEX "GroupCall_groupId_endedAt_createdAt_idx" ON "GroupCall"("groupId", "endedAt", "createdAt");
CREATE UNIQUE INDEX "GroupCallParticipant_callId_connectionId_key" ON "GroupCallParticipant"("callId", "connectionId");
CREATE INDEX "GroupCallParticipant_callId_lastSeenAt_idx" ON "GroupCallParticipant"("callId", "lastSeenAt");
CREATE INDEX "GroupCallSignal_callId_toConnectionId_createdAt_idx" ON "GroupCallSignal"("callId", "toConnectionId", "createdAt");

ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_readerId_fkey" FOREIGN KEY ("readerId") REFERENCES "Reader"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GroupInvitation" ADD CONSTRAINT "GroupInvitation_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GroupInvitation" ADD CONSTRAINT "GroupInvitation_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GroupInvitation" ADD CONSTRAINT "GroupInvitation_invitedByReaderId_fkey" FOREIGN KEY ("invitedByReaderId") REFERENCES "Reader"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GroupInvitation" ADD CONSTRAINT "GroupInvitation_invitedUserId_fkey" FOREIGN KEY ("invitedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GroupInvitation" ADD CONSTRAINT "GroupInvitation_invitedReaderId_fkey" FOREIGN KEY ("invitedReaderId") REFERENCES "Reader"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GroupMessage" ADD CONSTRAINT "GroupMessage_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GroupMessage" ADD CONSTRAINT "GroupMessage_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GroupMessage" ADD CONSTRAINT "GroupMessage_senderReaderId_fkey" FOREIGN KEY ("senderReaderId") REFERENCES "Reader"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GroupCall" ADD CONSTRAINT "GroupCall_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GroupCall" ADD CONSTRAINT "GroupCall_startedByUserId_fkey" FOREIGN KEY ("startedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GroupCall" ADD CONSTRAINT "GroupCall_startedByReaderId_fkey" FOREIGN KEY ("startedByReaderId") REFERENCES "Reader"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GroupCallParticipant" ADD CONSTRAINT "GroupCallParticipant_callId_fkey" FOREIGN KEY ("callId") REFERENCES "GroupCall"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GroupCallParticipant" ADD CONSTRAINT "GroupCallParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GroupCallParticipant" ADD CONSTRAINT "GroupCallParticipant_readerId_fkey" FOREIGN KEY ("readerId") REFERENCES "Reader"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GroupCallSignal" ADD CONSTRAINT "GroupCallSignal_callId_fkey" FOREIGN KEY ("callId") REFERENCES "GroupCall"("id") ON DELETE CASCADE ON UPDATE CASCADE;