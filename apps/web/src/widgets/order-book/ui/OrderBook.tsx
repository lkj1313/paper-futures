import type { MarketSymbol } from '@paper-futures/shared';
import {
  useDepth,
  useMark,
  useMarketSubscription,
  useRecentTrades,
} from '@/entities/market';
import { useNow } from '@/shared/lib/use-now';
import { OrderBookView } from './OrderBookView';

export function OrderBook({ symbol }: { symbol: MarketSymbol }) {
  useMarketSubscription(symbol);
  const depth = useDepth(symbol);
  const trades = useRecentTrades(symbol);
  const mark = useMark(symbol);
  const now = useNow(1000);

  return (
    <OrderBookView
      symbol={symbol}
      depth={depth}
      trades={trades}
      mark={mark}
      now={now}
    />
  );
}
