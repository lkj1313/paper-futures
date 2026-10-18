import type { MarketSymbol } from '@paper-futures/shared';
import { useMarketSubscription, useRecentTrades } from '@/entities/market';
import { useOrderDraft } from '@/features/place-order';
import { RecentTradesView } from './RecentTradesView';

export function RecentTrades({ symbol }: { symbol: MarketSymbol }) {
  useMarketSubscription(symbol);
  const trades = useRecentTrades(symbol);
  const pickPrice = useOrderDraft((state) => state.pickPrice);

  return (
    <RecentTradesView
      symbol={symbol}
      trades={trades}
      onPriceClick={(price) => pickPrice(symbol, price)}
    />
  );
}
