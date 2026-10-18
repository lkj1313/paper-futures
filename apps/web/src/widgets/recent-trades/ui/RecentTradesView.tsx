import type { MarketSymbol, MarketTrade } from '@paper-futures/shared';
import { formatPrice, formatQty, formatTime } from '@/shared/lib/format';
import { baseAssetOf } from '@/shared/lib/symbol';
import { cn } from '@/shared/lib/utils';

export interface RecentTradesViewProps {
  symbol: MarketSymbol;
  trades: MarketTrade[];
  onPriceClick?: (price: string) => void;
}

const ROW_LAYOUT = 'grid w-full grid-cols-3 px-3 py-0.5';

export function RecentTradesView({
  symbol,
  trades,
  onPriceClick,
}: RecentTradesViewProps) {
  return (
    <div className="flex h-full flex-col text-xs tabular-nums">
      <div className="grid shrink-0 grid-cols-3 px-3 py-2 text-muted-foreground">
        <span>가격(USDT)</span>
        <span className="text-right">수량({baseAssetOf(symbol)})</span>
        <span className="text-right">시간</span>
      </div>
      <div className="relative min-h-0 flex-1">
        <ol aria-label="최근 체결" className="h-full overflow-y-auto">
          {trades.map((trade) => {
            const content = (
              <>
                <span
                  className={trade.side === 'BUY' ? 'text-up' : 'text-down'}
                >
                  {formatPrice(symbol, trade.price)}
                </span>
                <span className="text-right">
                  {formatQty(symbol, trade.qty)}
                </span>
                <span className="text-right text-muted-foreground">
                  {formatTime(trade.time)}
                </span>
              </>
            );
            return (
              <li key={trade.id}>
                {onPriceClick ? (
                  <button
                    type="button"
                    aria-label={`${formatPrice(symbol, trade.price)}에 지정가 주문`}
                    className={cn(
                      ROW_LAYOUT,
                      'cursor-pointer text-left hover:bg-muted/60',
                    )}
                    onClick={() => onPriceClick(trade.price)}
                  >
                    {content}
                  </button>
                ) : (
                  <div className={ROW_LAYOUT}>{content}</div>
                )}
              </li>
            );
          })}
        </ol>
        {trades.length === 0 && (
          <p className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            아직 체결이 없습니다
          </p>
        )}
      </div>
    </div>
  );
}
