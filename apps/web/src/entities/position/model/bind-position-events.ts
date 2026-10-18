import type { QueryClient } from '@tanstack/react-query';
import type { RealtimeSocket } from '@/shared/socket';
import { positionsQueryKey } from '../api/use-positions';

export function bindPositionEvents(
  socket: RealtimeSocket,
  client: QueryClient,
) {
  socket.on('positions', ({ positions }) =>
    client.setQueryData(positionsQueryKey, positions),
  );
  socket.on('connect', () => {
    void client.invalidateQueries({ queryKey: positionsQueryKey });
  });
}
