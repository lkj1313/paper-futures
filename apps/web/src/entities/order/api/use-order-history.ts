import type { AccountOrder, CursorPage } from '@paper-futures/shared';
import { useInfiniteQuery } from '@tanstack/react-query';
import { http } from '@/shared/api/http';
import { useTokenStore } from '@/shared/api/token-store';

export const orderHistoryQueryKey = ['orders', 'history'] as const;

export function useOrderHistory() {
  const isLoggedIn = useTokenStore((state) => state.accessToken !== null);

  return useInfiniteQuery({
    queryKey: orderHistoryQueryKey,
    queryFn: ({ pageParam }) =>
      http
        .get<CursorPage<AccountOrder>>('/orders', {
          params: { cursor: pageParam },
        })
        .then((res) => res.data),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    select: (data) => data.pages.flatMap((page) => page.items),
    enabled: isLoggedIn,
  });
}
