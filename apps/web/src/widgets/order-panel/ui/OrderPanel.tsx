import type { MarketSymbol } from '@paper-futures/shared';
import { OrderForm } from '@/features/place-order';
import { WalletSummary } from './WalletSummary';

export function OrderPanel({ symbol }: { symbol: MarketSymbol }) {
  return (
    <div className="flex h-full flex-col divide-y divide-border overflow-y-auto">
      <OrderForm symbol={symbol} />
      <WalletSummary />
    </div>
  );
}
