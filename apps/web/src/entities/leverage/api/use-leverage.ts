import {
  DEFAULT_LEVERAGE,
  type LeverageSettings,
  type MarketSymbol,
} from '@paper-futures/shared';
import { useQuery } from '@tanstack/react-query';
import { http } from '@/shared/api/http';
import { useTokenStore } from '@/shared/api/token-store';

export const leverageQueryKey = ['leverage'] as const;

function useLeverageQuery<T = LeverageSettings>(
  select?: (settings: LeverageSettings) => T,
) {
  const isLoggedIn = useTokenStore((state) => state.accessToken !== null);

  return useQuery({
    queryKey: leverageQueryKey,
    queryFn: () =>
      http.get<LeverageSettings>('/leverage').then((res) => res.data),
    enabled: isLoggedIn,
    select,
  });
}

export const useLeverageSettings = () => useLeverageQuery();

export const useLeverage = (symbol: MarketSymbol) =>
  useLeverageQuery((settings) => settings[symbol]).data ?? DEFAULT_LEVERAGE;
