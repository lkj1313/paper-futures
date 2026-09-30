-- AlterEnum
ALTER TYPE "LedgerEntryType" ADD VALUE 'LIQUIDATION';

-- AlterEnum
ALTER TYPE "OrderType" ADD VALUE 'LIQUIDATION';

-- AlterTable
ALTER TABLE "LedgerEntry" ALTER COLUMN "id" SET DEFAULT uuidv7();

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "id" SET DEFAULT uuidv7();

-- AlterTable
ALTER TABLE "Position" ADD COLUMN     "liquidationPrice" DECIMAL(20,8);

-- 이미 열려 있는 포지션의 청산가를 채운다 (shared의 isolatedLiquidationPrice와 같은 공식)
-- 유지증거금률은 이 마이그레이션 시점의 MARKET_SPECS 값
UPDATE "Position" p
SET "liquidationPrice" = ROUND(GREATEST(0,
  CASE p."side"
    WHEN 'LONG' THEN (p."entryPrice" * p."qty" - p."isolatedMargin") / (p."qty" * (1 - s.mmr))
    ELSE (p."entryPrice" * p."qty" + p."isolatedMargin") / (p."qty" * (1 + s.mmr))
  END), 8)
FROM (VALUES ('BTCUSDT', 0.004), ('ETHUSDT', 0.005)) AS s(symbol, mmr)
WHERE p."symbol" = s.symbol;

ALTER TABLE "Position" ALTER COLUMN "liquidationPrice" SET NOT NULL;
ALTER TABLE "Position" ADD CONSTRAINT "Position_liquidation_price_non_negative" CHECK ("liquidationPrice" >= 0);

-- CreateIndex
CREATE INDEX "Position_symbol_side_liquidationPrice_idx" ON "Position"("symbol", "side", "liquidationPrice");
