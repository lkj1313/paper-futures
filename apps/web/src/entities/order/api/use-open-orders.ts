import type { AccountOrder, CursorPage } from '@paper-futures/shared';
import { useQuery } from '@tanstack/react-query';
import { http } from '@/shared/api/http';
import { useTokenStore } from '@/shared/api/token-store';

export const openOrdersQueryKey = ['orders', 'open'] as const;

export function useOpenOrders() {
  const isLoggedIn = useTokenStore((state) => state.accessToken !== null);

  return useQuery({
    queryKey: openOrdersQueryKey,
    queryFn: () =>
      http
        .get<CursorPage<AccountOrder>>('/orders', {
          params: { status: 'NEW', limit: 100 },
        })
        .then((res) => res.data.items),
    enabled: isLoggedIn,
  });
}
