-- CreateEnum
CREATE TYPE "PurchaseSuggestionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Collection" ADD COLUMN     "ownerReaderId" TEXT;

-- CreateTable
CREATE TABLE "PurchaseSuggestion" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "isbn" TEXT,
    "reason" TEXT,
    "status" "PurchaseSuggestionStatus" NOT NULL DEFAULT 'PENDING',
    "readerId" TEXT,
    "userId" TEXT,
    "proposerName" TEXT,
    "proposerEmail" TEXT,
    "bookId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "PurchaseSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "readerId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PurchaseSuggestion_status_createdAt_idx" ON "PurchaseSuggestion"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PurchaseSuggestion_readerId_idx" ON "PurchaseSuggestion"("readerId");

-- CreateIndex
CREATE INDEX "PurchaseSuggestion_userId_idx" ON "PurchaseSuggestion"("userId");

-- CreateIndex
CREATE INDEX "Notification_readerId_readAt_idx" ON "Notification"("readerId", "readAt");

-- CreateIndex
CREATE INDEX "Notification_kind_idx" ON "Notification"("kind");

-- CreateIndex
CREATE INDEX "Collection_ownerReaderId_idx" ON "Collection"("ownerReaderId");

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_ownerReaderId_fkey" FOREIGN KEY ("ownerReaderId") REFERENCES "Reader"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseSuggestion" ADD CONSTRAINT "PurchaseSuggestion_readerId_fkey" FOREIGN KEY ("readerId") REFERENCES "Reader"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseSuggestion" ADD CONSTRAINT "PurchaseSuggestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseSuggestion" ADD CONSTRAINT "PurchaseSuggestion_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_readerId_fkey" FOREIGN KEY ("readerId") REFERENCES "Reader"("id") ON DELETE CASCADE ON UPDATE CASCADE;
