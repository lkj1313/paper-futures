import {
  MARKET_SPECS,
  type MarketSymbol,
  toDecimal,
} from '@paper-futures/shared';

export const toTickPrice = (symbol: MarketSymbol, price: string) =>
  toDecimal(price).toFixed(
    MARKET_SPECS[symbol].tickSize.split('.')[1]?.length ?? 0,
  );
