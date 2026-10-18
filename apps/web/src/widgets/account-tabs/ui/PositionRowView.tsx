import type {
  AccountPosition,
  MarketSymbol,
  PositionLiveValues,
} from '@paper-futures/shared';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import {
  formatPrice,
  formatQty,
  formatRatioPercent,
  formatSignedUsdt,
  formatUsdt,
} from '@/shared/lib/format';
import { baseAssetOf } from '@/shared/lib/symbol';
import { toneOf } from '@/shared/lib/tone';
import { cn } from '@/shared/lib/utils';
import { CELL_CLASS, EMPTY } from './table';

export interface PositionRowViewProps {
  symbol: MarketSymbol;
  position: AccountPosition;
  live: PositionLiveValues;
  closeSlot?: ReactNode;
}

export function PositionRowView({
  symbol,
  position,
  live,
  closeSlot,
}: PositionRowViewProps) {
  const staleProps = live.stale
    ? { className: 'opacity-40', title: '시세가 늦게 들어오고 있습니다' }
    : {};

  return (
    <tr className="border-t border-border/50">
      <td className={CELL_CLASS}>
        <div className="flex items-center gap-1.5">
          <Link to={`/trade/${symbol}`} className="font-medium hover:underline">
            {symbol}
          </Link>
          <span className={position.side === 'LONG' ? 'text-up' : 'text-down'}>
            {position.side === 'LONG' ? '롱' : '숏'}
          </span>
          <span className="text-muted-foreground">{position.leverage}x</span>
        </div>
      </td>
      <td className={CELL_CLASS}>
        {formatQty(symbol, position.qty)} {baseAssetOf(symbol)}
      </td>
      <td className={CELL_CLASS}>{formatPrice(symbol, position.entryPrice)}</td>
      <td {...staleProps} className={cn(CELL_CLASS, staleProps.className)}>
        {live.markPrice ? formatPrice(symbol, live.markPrice) : EMPTY}
      </td>
      <td className={CELL_CLASS}>
        {formatPrice(symbol, position.liquidationPrice)}
      </td>
      <td className={CELL_CLASS}>{formatUsdt(position.isolatedMargin)}</td>
      <td {...staleProps} className={cn(CELL_CLASS, staleProps.className)}>
        {live.unrealizedPnl && live.roe ? (
          <span className={toneOf(live.unrealizedPnl)}>
            {`${formatSignedUsdt(live.unrealizedPnl)} (${formatRatioPercent(live.roe)})`}
          </span>
        ) : (
          EMPTY
        )}
      </td>
      <td className={CELL_CLASS}>{closeSlot}</td>
    </tr>
  );
}
