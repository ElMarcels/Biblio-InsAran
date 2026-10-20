-- AlterTable
ALTER TABLE "Loan" ADD COLUMN     "renewals" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Reader" ADD COLUMN     "lastReaderLoginAt" TIMESTAMP(3),
ADD COLUMN     "pinHash" TEXT,
ADD COLUMN     "pinMustChange" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "ReaderSession" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "readerId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT,
    "ip" TEXT,

    CONSTRAINT "ReaderSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Changelog" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "Changelog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangelogView" (
    "changelogId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChangelogView_pkey" PRIMARY KEY ("changelogId","userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReaderSession_tokenHash_key" ON "ReaderSession"("tokenHash");

-- CreateIndex
CREATE INDEX "ReaderSession_readerId_idx" ON "ReaderSession"("readerId");

-- CreateIndex
CREATE INDEX "ReaderSession_expiresAt_idx" ON "ReaderSession"("expiresAt");

-- CreateIndex
CREATE INDEX "Changelog_createdAt_idx" ON "Changelog"("createdAt");

-- CreateIndex
CREATE INDEX "ChangelogView_userId_idx" ON "ChangelogView"("userId");

-- AddForeignKey
ALTER TABLE "ReaderSession" ADD CONSTRAINT "ReaderSession_readerId_fkey" FOREIGN KEY ("readerId") REFERENCES "Reader"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Changelog" ADD CONSTRAINT "Changelog_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangelogView" ADD CONSTRAINT "ChangelogView_changelogId_fkey" FOREIGN KEY ("changelogId") REFERENCES "Changelog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangelogView" ADD CONSTRAINT "ChangelogView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
