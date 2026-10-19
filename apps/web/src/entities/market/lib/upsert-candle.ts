import type { Candle } from '@paper-futures/shared';

export function upsertCandle(candles: Candle[], candle: Candle): Candle[] {
  const last = candles.at(-1);
  if (!last || candle.time > last.time) return [...candles, candle];
  if (candle.time === last.time) return [...candles.slice(0, -1), candle];
  return candles;
}
