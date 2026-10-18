import type { AccountOrder } from '@paper-futures/shared';
import type { QueryClient } from '@tanstack/react-query';
import type { RealtimeSocket } from '@/shared/socket';
import { openOrdersQueryKey } from '../api/use-open-orders';

function applyOrderUpdates(current: AccountOrder[], updates: AccountOrder[]) {
  const updatedIds = new Set(updates.map((order) => order.id));
  return [
    ...current.filter((order) => !updatedIds.has(order.id)),
    ...updates.filter((order) => order.status === 'NEW'),
  ].sort((a, b) => b.id.localeCompare(a.id));
}

export function bindOrderEvents(socket: RealtimeSocket, client: QueryClient) {
  socket.on('orders', ({ orders }) =>
    client.setQueryData<AccountOrder[]>(
      openOrdersQueryKey,
      (current) => current && applyOrderUpdates(current, orders),
    ),
  );
  socket.on('connect', () => {
    void client.invalidateQueries({ queryKey: openOrdersQueryKey });
  });
}
