import type { AccountLedgerEntry, CursorPage } from '@paper-futures/shared';
import { useInfiniteQuery } from '@tanstack/react-query';
import { http } from '@/shared/api/http';
import { useTokenStore } from '@/shared/api/token-store';

export const ledgerQueryKey = ['wallet', 'ledger'] as const;

export function useLedger() {
  const isLoggedIn = useTokenStore((state) => state.accessToken !== null);

  return useInfiniteQuery({
    queryKey: ledgerQueryKey,
    queryFn: ({ pageParam }) =>
      http
        .get<CursorPage<AccountLedgerEntry>>('/wallet/ledger', {
          params: { cursor: pageParam },
        })
        .then((res) => res.data),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    select: (data) => data.pages.flatMap((page) => page.items),
    enabled: isLoggedIn,
  });
}
