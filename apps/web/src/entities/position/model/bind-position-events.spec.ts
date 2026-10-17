import type { AccountPosition } from '@paper-futures/shared';
import { describe, expect, it } from 'vitest';
import { createFakeSocket } from '@/test/fake-socket';
import { createTestQueryClient } from '@/test/render';
import { positionsQueryKey } from '../api/use-positions';
import { bindPositionEvents } from './bind-position-events';

const BTC_LONG: AccountPosition = {
  symbol: 'BTCUSDT',
  side: 'LONG',
  qty: '0.010',
  entryPrice: '81565.0',
  leverage: 10,
  isolatedMargin: '81.565',
  liquidationPrice: '73734.76',
};

describe('bindPositionEvents', () => {
  it('소켓으로 받은 포지션 목록을 캐시에 바로 넣는다', () => {
    const client = createTestQueryClient();
    const { socket, receive } = createFakeSocket();
    bindPositionEvents(socket, client);
    client.setQueryData(positionsQueryKey, []);

    receive('positions', { positions: [BTC_LONG] });

    expect(client.getQueryData(positionsQueryKey)).toEqual([BTC_LONG]);
  });

  it('다시 연결되면 포지션을 낡은 것으로 표시해 다시 받게 한다', () => {
    const client = createTestQueryClient();
    const { socket, receive } = createFakeSocket();
    bindPositionEvents(socket, client);
    client.setQueryData(positionsQueryKey, [BTC_LONG]);

    receive('connect');

    expect(client.getQueryState(positionsQueryKey)?.isInvalidated).toBe(true);
  });
});
