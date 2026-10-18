import type { MarketSymbol } from '@paper-futures/shared';
import {
  useDepth,
  useMark,
  useMarketSubscription,
  useRecentTrades,
} from '@/entities/market';
import { useOrderDraft } from '@/features/place-order';
import { useNow } from '@/shared/lib/use-now';
import { useThrottledValue } from '@/shared/lib/use-throttled-value';
import { OrderBookView } from './OrderBookView';

const REDRAW_MS = 500;

export function OrderBook({ symbol }: { symbol: MarketSymbol }) {
  useMarketSubscription(symbol);
  const depth = useThrottledValue(useDepth(symbol), REDRAW_MS);
  const trades = useThrottledValue(useRecentTrades(symbol), REDRAW_MS);
  const mark = useMark(symbol);
  const now = useNow(1000);
  const pickPrice = useOrderDraft((state) => state.pickPrice);

  return (
    <OrderBookView
      symbol={symbol}
      depth={depth}
      trades={trades}
      mark={mark}
      now={now}
      onPriceClick={(price) => pickPrice(symbol, price)}
    />
  );
}
