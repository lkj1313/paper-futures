import type { MarketSymbol } from '@paper-futures/shared';
import { useEffect } from 'react';
import { subscribeMarket, unsubscribeMarket } from '@/shared/socket';

export function useMarketSubscription(symbol: MarketSymbol) {
  useEffect(() => {
    subscribeMarket(symbol);
    return () => unsubscribeMarket(symbol);
  }, [symbol]);
}
