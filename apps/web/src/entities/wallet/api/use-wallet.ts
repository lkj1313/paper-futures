import type { AccountWallet } from '@paper-futures/shared';
import { useQuery } from '@tanstack/react-query';
import { http } from '@/shared/api/http';
import { useTokenStore } from '@/shared/api/token-store';

export const walletQueryKey = ['wallet'] as const;

export function useWallet() {
  const isLoggedIn = useTokenStore((state) => state.accessToken !== null);

  return useQuery({
    queryKey: walletQueryKey,
    queryFn: () => http.get<AccountWallet>('/wallet').then((res) => res.data),
    enabled: isLoggedIn,
  });
}
