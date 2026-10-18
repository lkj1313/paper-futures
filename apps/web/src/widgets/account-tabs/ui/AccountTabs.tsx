import { useOpenOrders } from '@/entities/order';
import { usePositions } from '@/entities/position';
import { useIsLoggedIn } from '@/entities/session';
import { AccountTabsView } from './AccountTabsView';
import { LedgerTable } from './LedgerTable';
import { OpenOrdersTable } from './OpenOrdersTable';
import { OrderHistoryTable } from './OrderHistoryTable';
import { PositionsTable } from './PositionsTable';

export function AccountTabs() {
  const loggedIn = useIsLoggedIn();
  const { data: positions } = usePositions();
  const { data: openOrders } = useOpenOrders();

  return (
    <AccountTabsView
      loggedIn={loggedIn}
      positionCount={positions?.length}
      openOrderCount={openOrders?.length}
      positions={<PositionsTable />}
      openOrders={<OpenOrdersTable />}
      history={<OrderHistoryTable />}
      ledger={<LedgerTable />}
    />
  );
}
