import {
  isStale,
  type MarketSymbol,
  type MarketTrade,
  type MarkPriceInfo,
  type OrderBookDepth,
} from '@paper-futures/shared';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { priceDirection } from '@/entities/market';
import { formatPrice, formatQty } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';
import { type BookRow, bidShare, buildBookRows } from '../lib/book-rows';

const LEVELS = 10;
const EMPTY = '--';
const NO_LEVELS = { bids: [], asks: [] };

export interface OrderBookViewProps {
  symbol: MarketSymbol;
  depth?: OrderBookDepth;
  trades: MarketTrade[];
  mark?: MarkPriceInfo;
  now: number;
}

export function OrderBookView({
  symbol,
  depth,
  trades,
  mark,
  now,
}: OrderBookViewProps) {
  const stale = isStale(depth?.receivedAt, now);
  const { bids, asks } = buildBookRows(depth ?? NO_LEVELS, LEVELS);
  const share = bidShare(depth ?? NO_LEVELS);
  const bidPercent = share === null ? null : Math.round(share * 100);
  const lastPrice = trades[0]?.price;
  const direction = priceDirection(trades);
  const baseAsset = symbol.replace(/USDT$/, '');

  return (
    <div
      className={cn(
        'flex h-full flex-col text-xs tabular-nums transition-opacity',
        stale && 'opacity-40',
      )}
      title={stale ? '호가가 늦게 들어오고 있습니다' : undefined}
    >
      <div className="grid shrink-0 grid-cols-3 px-3 py-2 text-muted-foreground">
        <span>가격(USDT)</span>
        <span className="text-right">수량({baseAsset})</span>
        <span className="text-right">합계({baseAsset})</span>
      </div>
      <ol
        aria-label="매도 호가"
        className="flex min-h-0 flex-1 flex-col justify-end overflow-hidden"
      >
        {asks.toReversed().map((row) => (
          <BookRowItem key={row.price} symbol={symbol} row={row} side="ask" />
        ))}
      </ol>
      <div className="flex shrink-0 items-baseline gap-3 border-y border-border px-3 py-1.5">
        <span
          aria-label="현재가"
          className={cn(
            'flex items-center gap-1 text-base font-semibold',
            direction === 'up' && 'text-up',
            direction === 'down' && 'text-down',
          )}
        >
          {lastPrice ? formatPrice(symbol, lastPrice) : EMPTY}
          {direction === 'up' && <ArrowUp aria-hidden className="size-4" />}
          {direction === 'down' && <ArrowDown aria-hidden className="size-4" />}
        </span>
        <span aria-label="마크가격" className="text-muted-foreground">
          {mark ? formatPrice(symbol, mark.markPrice) : EMPTY}
        </span>
      </div>
      <ol aria-label="매수 호가" className="min-h-0 flex-1 overflow-hidden">
        {bids.map((row) => (
          <BookRowItem key={row.price} symbol={symbol} row={row} side="bid" />
        ))}
      </ol>
      <div
        aria-label="매수·매도 비율"
        className="flex shrink-0 items-center gap-2 border-t border-border px-3 py-2"
      >
        <span className="text-up">B {bidPercent ?? EMPTY}%</span>
        <div className="flex h-1 flex-1 gap-0.5">
          <div
            className="rounded-full bg-up"
            style={{ width: `${bidPercent ?? 50}%` }}
          />
          <div className="flex-1 rounded-full bg-down" />
        </div>
        <span className="text-down">
          {bidPercent === null ? EMPTY : 100 - bidPercent}% S
        </span>
      </div>
    </div>
  );
}

function BookRowItem({
  symbol,
  row,
  side,
}: {
  symbol: MarketSymbol;
  row: BookRow;
  side: 'bid' | 'ask';
}) {
  return (
    <li className="relative grid shrink-0 grid-cols-3 px-3 py-0.5">
      <span
        aria-hidden
        className={cn(
          'absolute inset-y-0 right-0',
          side === 'ask' ? 'bg-down/15' : 'bg-up/15',
        )}
        style={{ width: `${row.ratio * 100}%` }}
      />
      <span
        className={cn('relative', side === 'ask' ? 'text-down' : 'text-up')}
      >
        {formatPrice(symbol, row.price)}
      </span>
      <span className="relative text-right">{formatQty(symbol, row.qty)}</span>
      <span className="relative text-right">
        {formatQty(symbol, row.total)}
      </span>
    </li>
  );
}
