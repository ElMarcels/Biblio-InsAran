-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "readerId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "approved" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Review_bookId_idx" ON "Review"("bookId");

-- CreateIndex
CREATE INDEX "Review_approved_idx" ON "Review"("approved");

-- CreateIndex
CREATE UNIQUE INDEX "Review_bookId_readerId_key" ON "Review"("bookId", "readerId");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_readerId_fkey" FOREIGN KEY ("readerId") REFERENCES "Reader"("id") ON DELETE CASCADE ON UPDATE CASCADE;
