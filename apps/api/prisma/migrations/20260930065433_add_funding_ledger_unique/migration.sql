-- 한 펀딩 회차에서 지갑 하나에는 원장 한 줄만 (두 번 정산 방지)
-- CreateIndex
CREATE UNIQUE INDEX "LedgerEntry_fundingRoundId_walletId_key" ON "LedgerEntry"("fundingRoundId", "walletId");
