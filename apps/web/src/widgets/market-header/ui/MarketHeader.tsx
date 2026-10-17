import type { MarketSymbol } from '@paper-futures/shared';
import {
  useMark,
  useMarketSubscription,
  useRecentTrades,
  useTicker,
} from '@/entities/market';
import { useNow } from '@/shared/lib/use-now';
import { MarketHeaderView } from './MarketHeaderView';

export function MarketHeader({ symbol }: { symbol: MarketSymbol }) {
  useMarketSubscription(symbol);
  const trades = useRecentTrades(symbol);
  const mark = useMark(symbol);
  const ticker = useTicker(symbol);
  const now = useNow(1000);

  return (
    <MarketHeaderView
      symbol={symbol}
      trades={trades}
      mark={mark}
      ticker={ticker}
      now={now}
    />
  );
}
