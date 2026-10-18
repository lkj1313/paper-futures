-- CreateTable
CREATE TABLE "LeverageSetting" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "symbol" TEXT NOT NULL,
    "leverage" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeverageSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeverageSetting_userId_symbol_key" ON "LeverageSetting"("userId", "symbol");

-- AddForeignKey
ALTER TABLE "LeverageSetting" ADD CONSTRAINT "LeverageSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
