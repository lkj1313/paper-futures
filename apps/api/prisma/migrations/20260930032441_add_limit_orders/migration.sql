-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'NEW';
ALTER TYPE "OrderStatus" ADD VALUE 'CANCELED';
ALTER TYPE "OrderStatus" ADD VALUE 'EXPIRED';

-- AlterEnum
ALTER TYPE "OrderType" ADD VALUE 'LIMIT';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "price" DECIMAL(20,8),
ADD COLUMN     "reservedMargin" DECIMAL(20,8) NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3),
ALTER COLUMN "avgFillPrice" DROP NOT NULL,
ALTER COLUMN "fee" SET DEFAULT 0;

-- 기존 주문은 만들어질 때 바로 체결됐으므로 만든 시각으로 채운다
UPDATE "Order" SET "updatedAt" = "createdAt";
ALTER TABLE "Order" ALTER COLUMN "updatedAt" SET NOT NULL;

-- 값의 범위를 DB에서도 한 번 더 막는다
-- (방금 추가한 enum 값은 같은 트랜잭션에서 쓸 수 없어서 문자열로 비교한다)
ALTER TABLE "Order" ADD CONSTRAINT "Order_price_positive" CHECK ("price" > 0);
ALTER TABLE "Order" ADD CONSTRAINT "Order_limit_has_price" CHECK ("type"::text <> 'LIMIT' OR "price" IS NOT NULL);
ALTER TABLE "Order" ADD CONSTRAINT "Order_filled_has_fill_price" CHECK ("status"::text <> 'FILLED' OR "avgFillPrice" IS NOT NULL);
ALTER TABLE "Order" ADD CONSTRAINT "Order_reserved_margin_non_negative" CHECK ("reservedMargin" >= 0);

-- CreateIndex
CREATE INDEX "Order_symbol_status_side_price_idx" ON "Order"("symbol", "status", "side", "price");
