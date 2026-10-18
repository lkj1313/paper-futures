import { useLedger } from '@/entities/wallet';
import { LedgerTableView } from './LedgerTableView';

export function LedgerTable() {
  const { data, hasNextPage, isFetchingNextPage, fetchNextPage } = useLedger();

  return (
    <LedgerTableView
      entries={data}
      hasMore={hasNextPage}
      loadingMore={isFetchingNextPage}
      onLoadMore={() => void fetchNextPage()}
    />
  );
}
