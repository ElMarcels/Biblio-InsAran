-- AlterTable
ALTER TABLE "Book" ADD COLUMN     "cdu" TEXT,
ADD COLUMN     "coverUrl" TEXT,
ADD COLUMN     "recordNumber" TEXT;

-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookCollection" (
    "bookId" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookCollection_pkey" PRIMARY KEY ("bookId","collectionId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Collection_slug_key" ON "Collection"("slug");

-- CreateIndex
CREATE INDEX "Collection_position_idx" ON "Collection"("position");

-- CreateIndex
CREATE INDEX "BookCollection_collectionId_position_idx" ON "BookCollection"("collectionId", "position");

-- CreateIndex
CREATE INDEX "Book_recordNumber_idx" ON "Book"("recordNumber");

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookCollection" ADD CONSTRAINT "BookCollection_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookCollection" ADD CONSTRAINT "BookCollection_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
