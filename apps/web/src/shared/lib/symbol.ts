import type { MarketSymbol } from '@paper-futures/shared';

export const baseAssetOf = (symbol: MarketSymbol) =>
  symbol.replace(/USDT$/, '');
