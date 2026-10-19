import type { AccountWallet } from '@paper-futures/shared';
import type { ReactNode } from 'react';
import { formatUsdt } from '@/shared/lib/format';

const ROWS = [
  { label: '잔고', key: 'balance' },
  { label: '주문 가능', key: 'availableBalance' },
  { label: '포지션 증거금', key: 'usedMargin' },
  { label: '대기 주문 증거금', key: 'openOrderMargin' },
] as const;

export function WalletSummaryView({
  wallet,
  action,
}: {
  wallet?: AccountWallet;
  action?: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2 p-3 text-xs">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">지갑</h2>
        {action}
      </div>
      <dl className="flex flex-col gap-1.5">
        {ROWS.map(({ label, key }) => (
          <div key={key} className="flex justify-between">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="tabular-nums">
              {wallet ? formatUsdt(wallet[key]) : '--'} USDT
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
