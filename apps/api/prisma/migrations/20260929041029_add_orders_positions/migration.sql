-- CreateEnum
CREATE TYPE "OrderSide" AS ENUM ('BUY', 'SELL');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('MARKET');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('FILLED');

-- CreateEnum
CREATE TYPE "PositionSide" AS ENUM ('LONG', 'SHORT');

-- AlterEnum
ALTER TYPE "LedgerEntryType" ADD VALUE 'TRADING_FEE';

-- AlterTable
ALTER TABLE "LedgerEntry" ADD COLUMN     "orderId" UUID;

-- CreateTable
CREATE TABLE "Order" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "symbol" TEXT NOT NULL,
    "side" "OrderSide" NOT NULL,
    "type" "OrderType" NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "qty" DECIMAL(20,8) NOT NULL,
    "leverage" INTEGER NOT NULL,
    "avgFillPrice" DECIMAL(20,8) NOT NULL,
    "fee" DECIMAL(20,8) NOT NULL,
    "realizedPnl" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Position" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "symbol" TEXT NOT NULL,
    "side" "PositionSide" NOT NULL,
    "qty" DECIMAL(20,8) NOT NULL,
    "entryPrice" DECIMAL(20,8) NOT NULL,
    "leverage" INTEGER NOT NULL,
    "isolatedMargin" DECIMAL(20,8) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Order_userId_createdAt_idx" ON "Order"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Position_userId_symbol_key" ON "Position"("userId", "symbol");

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 값의 범위를 DB에서도 한 번 더 막는다 (Prisma 스키마로는 표현 불가)
ALTER TABLE "Order" ADD CONSTRAINT "Order_qty_positive" CHECK ("qty" > 0);
ALTER TABLE "Order" ADD CONSTRAINT "Order_leverage_positive" CHECK ("leverage" >= 1);
ALTER TABLE "Order" ADD CONSTRAINT "Order_fee_non_negative" CHECK ("fee" >= 0);
ALTER TABLE "Position" ADD CONSTRAINT "Position_qty_positive" CHECK ("qty" > 0);
ALTER TABLE "Position" ADD CONSTRAINT "Position_leverage_positive" CHECK ("leverage" >= 1);
ALTER TABLE "Position" ADD CONSTRAINT "Position_margin_non_negative" CHECK ("isolatedMargin" >= 0);
