import type { AccountWallet } from '@paper-futures/shared';
import { describe, expect, it } from 'vitest';
import { createFakeSocket } from '@/test/fake-socket';
import { createTestQueryClient } from '@/test/render';
import { walletQueryKey } from '../api/use-wallet';
import { bindWalletEvents } from './bind-wallet-events';

const wallet = (availableBalance: string): AccountWallet => ({
  asset: 'USDT',
  balance: '10000',
  usedMargin: '0',
  openOrderMargin: '0',
  availableBalance,
});

describe('bindWalletEvents', () => {
  it('소켓으로 받은 지갑을 캐시에 바로 넣는다', () => {
    const client = createTestQueryClient();
    const { socket, receive } = createFakeSocket();
    bindWalletEvents(socket, client);

    receive('wallet', wallet('9918.44'));

    expect(client.getQueryData(walletQueryKey)).toEqual(wallet('9918.44'));
  });

  it('다시 연결되면 지갑을 낡은 것으로 표시해 다시 받게 한다', () => {
    const client = createTestQueryClient();
    const { socket, receive } = createFakeSocket();
    bindWalletEvents(socket, client);
    client.setQueryData(walletQueryKey, wallet('10000'));

    receive('connect');

    expect(client.getQueryState(walletQueryKey)?.isInvalidated).toBe(true);
  });
});
