-- AlterEnum
ALTER TYPE "LedgerEntryType" ADD VALUE 'REALIZED_PNL';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "reduceOnly" BOOLEAN NOT NULL DEFAULT false;
