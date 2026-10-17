import { isMarketSymbol, SYMBOLS } from '@paper-futures/shared';
import { Link, useParams } from 'react-router';
import { useIsLoggedIn, useMe } from '@/entities/session';
import { LogoutButton } from '@/features/auth';
import { cn } from '@/shared/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { MarketHeader } from '@/widgets/market-header';
import { OrderBook } from '@/widgets/order-book';
import { RecentTrades } from '@/widgets/recent-trades';

export function TradePage() {
  const { symbol } = useParams();
  const isLoggedIn = useIsLoggedIn();
  const { data: me } = useMe();

  if (!isMarketSymbol(symbol)) return null;

  return (
    <div className="grid h-screen grid-cols-[minmax(0,1fr)_280px_320px] grid-rows-[auto_minmax(0,1fr)_260px] gap-1 p-1">
      <header className="col-span-3 flex items-center gap-6 rounded-md bg-card px-4 py-3">
        <nav className="flex shrink-0 gap-1">
          {SYMBOLS.map((s) => (
            <Link
              key={s}
              to={`/trade/${s}`}
              className={cn(
                'rounded-md px-3 py-1 text-sm font-semibold',
                s === symbol
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {s}
            </Link>
          ))}
        </nav>
        <MarketHeader symbol={symbol} />
        <div className="ml-auto flex shrink-0 items-center gap-2 text-sm whitespace-nowrap">
          {isLoggedIn ? (
            <>
              <span className="text-muted-foreground">{me?.email}</span>
              <LogoutButton />
            </>
          ) : (
            <Link
              to="/login"
              className="text-muted-foreground hover:text-foreground"
            >
              로그인
            </Link>
          )}
        </div>
      </header>
      <Placeholder label="차트" />
      <section className="min-h-0 overflow-hidden rounded-md bg-card">
        <Tabs defaultValue="book" className="h-full gap-0">
          <TabsList variant="line" className="shrink-0 px-2 pt-2">
            <TabsTrigger value="book">호가창</TabsTrigger>
            <TabsTrigger value="trades">최근 체결</TabsTrigger>
          </TabsList>
          <TabsContent value="book" className="min-h-0">
            <OrderBook symbol={symbol} />
          </TabsContent>
          <TabsContent value="trades" className="min-h-0">
            <RecentTrades symbol={symbol} />
          </TabsContent>
        </Tabs>
      </section>
      <Placeholder label="주문 · 지갑" className="row-span-2" />
      <Placeholder
        label="포지션 · 대기 주문 · 주문 내역 · 원장"
        className="col-span-2"
      />
    </div>
  );
}

function Placeholder({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'flex items-center justify-center rounded-md bg-card text-sm text-muted-foreground',
        className,
      )}
    >
      {label}
    </section>
  );
}
