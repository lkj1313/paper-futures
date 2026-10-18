import { useOpenOrders } from '@/entities/order';
import { CancelOrderButton } from '@/features/cancel-order';
import { OpenOrdersTableView } from './OpenOrdersTableView';

export function OpenOrdersTable() {
  const { data: orders } = useOpenOrders();

  return (
    <OpenOrdersTableView
      orders={orders}
      renderCancel={(order) => <CancelOrderButton order={order} />}
    />
  );
}
