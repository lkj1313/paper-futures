import type { AccountPosition, MarketSymbol } from '@paper-futures/shared';
import { useQuery } from '@tanstack/react-query';
import { http } from '@/shared/api/http';
import { useTokenStore } from '@/shared/api/token-store';

export const positionsQueryKey = ['positions'] as const;

const toAccountPosition = ({
  symbol,
  side,
  qty,
  entryPrice,
  leverage,
  isolatedMargin,
  liquidationPrice,
}: AccountPosition): AccountPosition => ({
  symbol,
  side,
  qty,
  entryPrice,
  leverage,
  isolatedMargin,
  liquidationPrice,
});

function usePositionsQuery<T = AccountPosition[]>(
  select?: (positions: AccountPosition[]) => T,
) {
  const isLoggedIn = useTokenStore((state) => state.accessToken !== null);

  return useQuery({
    queryKey: positionsQueryKey,
    queryFn: () =>
      http
        .get<AccountPosition[]>('/positions')
        .then((res) => res.data.map(toAccountPosition)),
    enabled: isLoggedIn,
    select,
  });
}

export const usePositions = () => usePositionsQuery();

export const usePosition = (symbol: MarketSymbol) =>
  usePositionsQuery((positions) =>
    positions.find((position) => position.symbol === symbol),
  ).data;
