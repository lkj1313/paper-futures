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
import { useElementHeight } from '@/shared/lib/use-element-height';
import { baseAssetOf } from '@/shared/lib/symbol';
import { cn } from '@/shared/lib/utils';
import { type BookRow, bidShare, buildBookRows } from '../lib/book-rows';

const DEFAULT_LEVELS = 10;
const ROW_HEIGHT = 20;
const EMPTY = '--';
const NO_LEVELS = { bids: [], asks: [] };

export interface OrderBookViewProps {
  symbol: MarketSymbol;
  depth?: OrderBookDepth;
  trades: MarketTrade[];
  mark?: MarkPriceInfo;
  now: number;
  onPriceClick?: (price: string) => void;
}

export function OrderBookView({
  symbol,
  depth,
  trades,
  mark,
  now,
  onPriceClick,
}: OrderBookViewProps) {
  const stale = isStale(depth?.receivedAt, now);
  const [sideRef, sideHeight] = useElementHeight<HTMLOListElement>();
  const levels =
    sideHeight === null ? DEFAULT_LEVELS : Math.floor(sideHeight / ROW_HEIGHT);
  const { bids, asks } = buildBookRows(depth ?? NO_LEVELS, levels);
  const share = bidShare(depth ?? NO_LEVELS);
  const bidPercent = share === null ? null : Math.round(share * 100);
  const lastPrice = trades[0]?.price;
  const direction = priceDirection(trades);
  const baseAsset = baseAssetOf(symbol);
  const midPriceClass = cn(
    'flex items-center gap-1 text-base font-semibold',
    direction === 'up' && 'text-up',
    direction === 'down' && 'text-down',
  );
  const midPrice = (
    <>
      {lastPrice ? formatPrice(symbol, lastPrice) : EMPTY}
      {direction === 'up' && <ArrowUp aria-hidden className="size-4" />}
      {direction === 'down' && <ArrowDown aria-hidden className="size-4" />}
    </>
  );

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
        ref={sideRef}
        aria-label="매도 호가"
        className="flex min-h-0 flex-1 flex-col justify-end overflow-hidden"
      >
        {asks.toReversed().map((row) => (
          <BookRowItem
            key={row.price}
            symbol={symbol}
            row={row}
            side="ask"
            onPick={onPriceClick}
          />
        ))}
      </ol>
      <div className="flex shrink-0 items-baseline gap-3 border-y border-border px-3 py-1.5">
        {onPriceClick && lastPrice ? (
          <button
            type="button"
            aria-label="현재가"
            className={cn(midPriceClass, 'cursor-pointer hover:opacity-80')}
            onClick={() => onPriceClick(lastPrice)}
          >
            {midPrice}
          </button>
        ) : (
          <span aria-label="현재가" className={midPriceClass}>
            {midPrice}
          </span>
        )}
        <span aria-label="마크가격" className="text-muted-foreground">
          {mark ? formatPrice(symbol, mark.markPrice) : EMPTY}
        </span>
      </div>
      <ol aria-label="매수 호가" className="min-h-0 flex-1 overflow-hidden">
        {bids.map((row) => (
          <BookRowItem
            key={row.price}
            symbol={symbol}
            row={row}
            side="bid"
            onPick={onPriceClick}
          />
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

const ROW_LAYOUT = 'relative grid h-5 w-full grid-cols-3 items-center px-3';

function BookRowItem({
  symbol,
  row,
  side,
  onPick,
}: {
  symbol: MarketSymbol;
  row: BookRow;
  side: 'bid' | 'ask';
  onPick?: (price: string) => void;
}) {
  const content = (
    <>
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
    </>
  );

  return (
    <li className="shrink-0">
      {onPick ? (
        <button
          type="button"
          aria-label={`${formatPrice(symbol, row.price)}에 지정가 주문`}
          className={cn(
            ROW_LAYOUT,
            'cursor-pointer text-left hover:bg-muted/60',
          )}
          onClick={() => onPick(row.price)}
        >
          {content}
        </button>
      ) : (
        <div className={ROW_LAYOUT}>{content}</div>
      )}
    </li>
  );
}
