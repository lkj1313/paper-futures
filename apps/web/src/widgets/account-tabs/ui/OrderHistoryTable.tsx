import { useOrderHistory } from '@/entities/order';
import { OrderHistoryTableView } from './OrderHistoryTableView';

export function OrderHistoryTable() {
  const { data, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useOrderHistory();

  return (
    <OrderHistoryTableView
      orders={data}
      hasMore={hasNextPage}
      loadingMore={isFetchingNextPage}
      onLoadMore={() => void fetchNextPage()}
    />
  );
}
