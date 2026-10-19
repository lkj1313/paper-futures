import type {
  Candle,
  CandleInterval,
  CandlesQuery,
  MarketSymbol,
} from '@paper-futures/shared';
import { useQuery } from '@tanstack/react-query';
import { http } from '@/shared/api/http';

export const candlesQueryKey = (
  symbol: MarketSymbol,
  interval: CandleInterval,
) => ['candles', symbol, interval] as const;

export function useCandles(symbol: MarketSymbol, interval: CandleInterval) {
  return useQuery({
    queryKey: candlesQueryKey(symbol, interval),
    queryFn: () =>
      http
        .get<Candle[]>(`/markets/${symbol}/candles`, {
          params: { interval } satisfies CandlesQuery,
        })
        .then((res) => res.data),
    staleTime: Infinity,
  });
}
