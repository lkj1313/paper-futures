import { Injectable } from '@nestjs/common';
import {
  DEFAULT_LEVERAGE,
  type LeverageSettings,
  MARKET_SPECS,
  type MarketSymbol,
  SYMBOLS,
} from '@paper-futures/shared';
import { AppException } from '../common/app.exception.js';
import { PrismaService, type PrismaTx } from '../prisma/prisma.service.js';
import { WalletService } from '../wallet/wallet.service.js';

@Injectable()
export class LeverageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wallet: WalletService,
  ) {}

  async getAll(userId: string): Promise<LeverageSettings> {
    const rows = await this.prisma.leverageSetting.findMany({
      where: { userId },
    });
    const saved = new Map(rows.map((row) => [row.symbol, row.leverage]));
    return Object.fromEntries(
      SYMBOLS.map((symbol) => [symbol, saved.get(symbol) ?? DEFAULT_LEVERAGE]),
    ) as LeverageSettings;
  }

  async get(tx: PrismaTx, userId: string, symbol: MarketSymbol) {
    const row = await tx.leverageSetting.findUnique({
      where: { userId_symbol: { userId, symbol } },
    });
    return row?.leverage ?? DEFAULT_LEVERAGE;
  }

  async update(userId: string, symbol: MarketSymbol, leverage: number) {
    const { maxLeverage } = MARKET_SPECS[symbol];
    if (leverage > maxLeverage) {
      throw new AppException('INVALID_LEVERAGE', {
        message: `${symbol}의 최대 레버리지는 ${maxLeverage}배입니다.`,
      });
    }

    return this.prisma.transaction(async (tx) => {
      await this.wallet.lockByUserId(tx, userId);
      const position = await tx.position.findUnique({
        where: { userId_symbol: { userId, symbol } },
        select: { id: true },
      });
      if (position) throw new AppException('LEVERAGE_LOCKED');

      const saved = await tx.leverageSetting.upsert({
        where: { userId_symbol: { userId, symbol } },
        create: { userId, symbol, leverage },
        update: { leverage },
      });
      return saved.leverage;
    });
  }
}
