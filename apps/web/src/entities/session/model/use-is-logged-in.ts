import { useTokenStore } from '@/shared/api/token-store';

export const useIsLoggedIn = () =>
  useTokenStore((state) => state.accessToken !== null);
