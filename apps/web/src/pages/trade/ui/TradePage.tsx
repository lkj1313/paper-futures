import { SYMBOLS } from '@paper-futures/shared';
import { Link, useParams } from 'react-router';
import { useIsLoggedIn, useMe } from '@/entities/session';
import { cn } from '@/shared/lib/utils';

export function TradePage() {
  const { symbol } = useParams();
  const isLoggedIn = useIsLoggedIn();
  const { data: me } = useMe();

  return (
    <div className="grid h-screen grid-cols-[minmax(0,1fr)_280px_320px] grid-rows-[auto_minmax(0,1fr)_260px] gap-1 p-1">
      <header className="col-span-3 flex items-center gap-6 rounded-md bg-card px-4 py-3">
        <nav className="flex gap-1">
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
        <span className="text-sm text-muted-foreground">
          마크가격 · 24h 변동 · 펀딩비율 · 다음 펀딩까지
        </span>
        <div className="ml-auto text-sm">
          {isLoggedIn ? (
            <span className="text-muted-foreground">{me?.email}</span>
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
      <div className="grid grid-rows-2 gap-1">
        <Placeholder label="호가창" />
        <Placeholder label="최근 체결" />
      </div>
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
