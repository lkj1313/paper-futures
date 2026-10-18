import type { QueryClient } from '@tanstack/react-query';
import type { RealtimeSocket } from '@/shared/socket';
import { walletQueryKey } from '../api/use-wallet';

export function bindWalletEvents(socket: RealtimeSocket, client: QueryClient) {
  socket.on('wallet', (wallet) => client.setQueryData(walletQueryKey, wallet));
  socket.on('connect', () => {
    void client.invalidateQueries({ queryKey: walletQueryKey });
  });
}
