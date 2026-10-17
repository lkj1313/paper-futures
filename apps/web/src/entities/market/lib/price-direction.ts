import { type MarketTrade, toDecimal } from '@paper-futures/shared';

export type PriceDirection = 'up' | 'down';

export function priceDirection(trades: MarketTrade[]): PriceDirection | null {
  const [latest, ...older] = trades;
  if (!latest) return null;

  const latestPrice = toDecimal(latest.price);
  for (const trade of older) {
    const compared = latestPrice.cmp(trade.price);
    if (compared !== 0) return compared > 0 ? 'up' : 'down';
  }
  return null;
}
