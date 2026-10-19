import type { CandleInterval, MarketSymbol } from '@paper-futures/shared';
import { useEffect } from 'react';
import { subscribeCandles, unsubscribeCandles } from '@/shared/socket';

export function useCandleSubscription(
  symbol: MarketSymbol,
  interval: CandleInterval,
) {
  useEffect(() => {
    subscribeCandles({ symbol, interval });
    return () => unsubscribeCandles({ symbol, interval });
  }, [symbol, interval]);
}
