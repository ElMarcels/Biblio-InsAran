-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('ACTIVE', 'FULFILLED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Book" ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "Reader" (
    "id" TEXT NOT NULL,
    "cardNumber" TEXT,
    "fullName" TEXT NOT NULL,
    "groupName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reader_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Loan" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "readerId" TEXT NOT NULL,
    "loanedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "returnedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "readerId" TEXT NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdById" TEXT,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Reader_cardNumber_key" ON "Reader"("cardNumber");

-- CreateIndex
CREATE INDEX "Reader_fullName_idx" ON "Reader"("fullName");

-- CreateIndex
CREATE INDEX "Reader_active_idx" ON "Reader"("active");

-- CreateIndex
CREATE INDEX "Loan_bookId_idx" ON "Loan"("bookId");

-- CreateIndex
CREATE INDEX "Loan_readerId_idx" ON "Loan"("readerId");

-- CreateIndex
CREATE INDEX "Loan_returnedAt_idx" ON "Loan"("returnedAt");

-- CreateIndex
CREATE INDEX "Loan_dueAt_idx" ON "Loan"("dueAt");

-- CreateIndex
CREATE INDEX "Reservation_bookId_idx" ON "Reservation"("bookId");

-- CreateIndex
CREATE INDEX "Reservation_readerId_idx" ON "Reservation"("readerId");

-- CreateIndex
CREATE INDEX "Reservation_status_idx" ON "Reservation"("status");

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_readerId_fkey" FOREIGN KEY ("readerId") REFERENCES "Reader"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_readerId_fkey" FOREIGN KEY ("readerId") REFERENCES "Reader"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

