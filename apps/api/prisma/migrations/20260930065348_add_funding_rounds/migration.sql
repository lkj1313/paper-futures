-- AlterEnum
ALTER TYPE "LedgerEntryType" ADD VALUE 'FUNDING_FEE';

-- AlterTable
ALTER TABLE "LedgerEntry" ADD COLUMN     "fundingRoundId" UUID;

-- CreateTable
CREATE TABLE "FundingRound" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "symbol" TEXT NOT NULL,
    "fundingTime" TIMESTAMP(3) NOT NULL,
    "fundingRate" DECIMAL(20,8) NOT NULL,
    "markPrice" DECIMAL(20,8) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FundingRound_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FundingRound_symbol_fundingTime_key" ON "FundingRound"("symbol", "fundingTime");

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_fundingRoundId_fkey" FOREIGN KEY ("fundingRoundId") REFERENCES "FundingRound"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 값의 범위를 DB에서도 한 번 더 막는다
ALTER TABLE "FundingRound" ADD CONSTRAINT "FundingRound_mark_price_positive" CHECK ("markPrice" > 0);
