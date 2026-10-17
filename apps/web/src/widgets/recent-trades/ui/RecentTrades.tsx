import type { MarketSymbol } from '@paper-futures/shared';
import { useMarketSubscription, useRecentTrades } from '@/entities/market';
import { RecentTradesView } from './RecentTradesView';

export function RecentTrades({ symbol }: { symbol: MarketSymbol }) {
  useMarketSubscription(symbol);
  const trades = useRecentTrades(symbol);

  return <RecentTradesView symbol={symbol} trades={trades} />;
}
