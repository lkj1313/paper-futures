import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { buttonVariants } from '@/shared/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';

export interface AccountTabsViewProps {
  loggedIn: boolean;
  positionCount?: number;
  openOrderCount?: number;
  positions: ReactNode;
  openOrders: ReactNode;
  history: ReactNode;
  ledger: ReactNode;
}

const withCount = (label: string, count?: number) =>
  count === undefined ? label : `${label} (${count})`;

export function AccountTabsView({
  loggedIn,
  positionCount,
  openOrderCount,
  positions,
  openOrders,
  history,
  ledger,
}: AccountTabsViewProps) {
  if (!loggedIn) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
        <p>로그인하면 포지션과 주문을 볼 수 있습니다</p>
        <div className="flex gap-2">
          <Link to="/login" className={buttonVariants({ size: 'sm' })}>
            로그인
          </Link>
          <Link
            to="/signup"
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            회원가입
          </Link>
        </div>
      </div>
    );
  }

  return (
    <Tabs defaultValue="positions" className="h-full gap-0">
      <TabsList variant="line" className="shrink-0 px-2 pt-2">
        <TabsTrigger value="positions">
          {withCount('포지션', positionCount)}
        </TabsTrigger>
        <TabsTrigger value="openOrders">
          {withCount('대기 주문', openOrderCount)}
        </TabsTrigger>
        <TabsTrigger value="history">주문 내역</TabsTrigger>
        <TabsTrigger value="ledger">자산 기록</TabsTrigger>
      </TabsList>
      <TabsContent value="positions" className="min-h-0">
        {positions}
      </TabsContent>
      <TabsContent value="openOrders" className="min-h-0">
        {openOrders}
      </TabsContent>
      <TabsContent value="history" className="min-h-0">
        {history}
      </TabsContent>
      <TabsContent value="ledger" className="min-h-0">
        {ledger}
      </TabsContent>
    </Tabs>
  );
}
