import type { Candle } from '@paper-futures/shared';
import type { QueryClient } from '@tanstack/react-query';
import type { RealtimeSocket } from '@/shared/socket';
import { candlesQueryKey } from '../api/use-candles';
import { upsertCandle } from '../lib/upsert-candle';

export function bindCandleEvents(socket: RealtimeSocket, client: QueryClient) {
  socket.on('candle', ({ symbol, interval, candle }) =>
    client.setQueryData<Candle[]>(
      candlesQueryKey(symbol, interval),
      (candles) => candles && upsertCandle(candles, candle),
    ),
  );
  socket.on('connect', () => {
    void client.invalidateQueries({ queryKey: ['candles'] });
  });
}
