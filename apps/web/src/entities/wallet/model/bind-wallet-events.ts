import type { QueryClient } from '@tanstack/react-query';
import type { RealtimeSocket } from '@/shared/socket';
import { ledgerQueryKey } from '../api/use-ledger';
import { walletQueryKey } from '../api/use-wallet';

export function bindWalletEvents(socket: RealtimeSocket, client: QueryClient) {
  socket.on('wallet', (wallet) => {
    client.setQueryData(walletQueryKey, wallet);
    void client.invalidateQueries({ queryKey: ledgerQueryKey });
  });
  socket.on('connect', () => {
    void client.invalidateQueries({ queryKey: walletQueryKey, exact: true });
    void client.invalidateQueries({ queryKey: ledgerQueryKey });
  });
}
