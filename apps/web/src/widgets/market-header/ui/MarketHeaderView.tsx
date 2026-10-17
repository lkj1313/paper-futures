import {
  isStale,
  type MarketSymbol,
  type MarketTrade,
  type MarkPriceInfo,
  type Ticker24h,
  toDecimal,
} from '@paper-futures/shared';
import { priceDirection } from '@/entities/market';
import {
  formatCompact,
  formatCountdown,
  formatFundingRate,
  formatPercent,
  formatPrice,
  formatQty,
  formatSignedPrice,
} from '@/shared/lib/format';
import { baseAssetOf } from '@/shared/lib/symbol';
import { cn } from '@/shared/lib/utils';

const EMPTY = '--';

const toneOf = (value: string) => {
  const sign = toDecimal(value).cmp(0);
  if (sign > 0) return 'text-up';
  if (sign < 0) return 'text-down';
  return undefined;
};

export interface MarketHeaderViewProps {
  symbol: MarketSymbol;
  trades: MarketTrade[];
  mark?: MarkPriceInfo;
  ticker?: Ticker24h;
  now: number;
}

export function MarketHeaderView({
  symbol,
  trades,
  mark,
  ticker,
  now,
}: MarketHeaderViewProps) {
  const stale = isStale(mark?.receivedAt, now);
  const lastPrice = trades[0]?.price ?? ticker?.lastPrice;
  const direction = priceDirection(trades);
  const baseAsset = baseAssetOf(symbol);

  return (
    <dl
      className={cn(
        'flex min-w-0 items-center gap-6 overflow-x-auto whitespace-nowrap tabular-nums transition-opacity',
        stale && 'opacity-40',
      )}
      title={stale ? '시세가 늦게 들어오고 있습니다' : undefined}
    >
      <div>
        <dt className="sr-only">현재가</dt>
        <dd
          className={cn(
            'text-xl font-semibold',
            direction === 'up' && 'text-up',
            direction === 'down' && 'text-down',
          )}
        >
          {lastPrice ? formatPrice(symbol, lastPrice) : EMPTY}
        </dd>
      </div>
      <Stat
        label="마크가격"
        value={mark && formatPrice(symbol, mark.markPrice)}
      />
      <Stat
        label="인덱스가격"
        value={mark && formatPrice(symbol, mark.indexPrice)}
      />
      <Stat
        label="펀딩비 / 남은 시간"
        value={
          mark &&
          `${formatFundingRate(mark.fundingRate)} / ${formatCountdown(mark.nextFundingTime - now)}`
        }
      />
      <Stat
        label="24h 변동"
        value={
          ticker &&
          `${formatSignedPrice(symbol, ticker.priceChange)} ${formatPercent(ticker.priceChangePercent)}`
        }
        className={ticker && toneOf(ticker.priceChange)}
      />
      <Stat
        label="24h 고가"
        value={ticker && formatPrice(symbol, ticker.highPrice)}
      />
      <Stat
        label="24h 저가"
        value={ticker && formatPrice(symbol, ticker.lowPrice)}
      />
      <Stat
        label={`24h 거래량(${baseAsset})`}
        value={ticker && formatQty(symbol, ticker.volume)}
      />
      <Stat
        label="24h 거래량(USDT)"
        value={ticker && formatCompact(ticker.quoteVolume)}
      />
    </dl>
  );
}

function Stat({
  label,
  value,
  className,
}: {
  label: string;
  value?: string;
  className?: string;
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn('text-sm', className)}>{value ?? EMPTY}</dd>
    </div>
  );
}
