import type { AccountOrder } from '@paper-futures/shared';
import { describe, expect, it } from 'vitest';
import { createFakeSocket } from '@/test/fake-socket';
import { createTestQueryClient } from '@/test/render';
import { openOrdersQueryKey } from '../api/use-open-orders';
import { bindOrderEvents } from './bind-order-events';

const order = (
  id: string,
  fields: Partial<AccountOrder> = {},
): AccountOrder => ({
  id,
  symbol: 'BTCUSDT',
  side: 'BUY',
  type: 'LIMIT',
  status: 'NEW',
  qty: '0.002',
  price: '70000',
  leverage: 10,
  reduceOnly: false,
  reservedMargin: '14.028',
  avgFillPrice: null,
  fee: '0',
  realizedPnl: '0',
  createdAt: '2026-10-18T00:00:00.000Z',
  updatedAt: '2026-10-18T00:00:00.000Z',
  ...fields,
});

function setup(openOrders?: AccountOrder[]) {
  const client = createTestQueryClient();
  const { socket, receive } = createFakeSocket();
  bindOrderEvents(socket, client);
  if (openOrders) client.setQueryData(openOrdersQueryKey, openOrders);
  return { client, receive };
}

describe('bindOrderEvents', () => {
  it('새로 들어온 대기 주문은 최신순 자리에 넣는다', () => {
    const { client, receive } = setup([order('order-3'), order('order-1')]);

    receive('orders', { orders: [order('order-2'), order('order-4')] });

    expect(
      client.getQueryData<AccountOrder[]>(openOrdersQueryKey)?.map((o) => o.id),
    ).toEqual(['order-4', 'order-3', 'order-2', 'order-1']);
  });

  it('체결·취소·만료된 주문은 대기 주문에서 뺀다', () => {
    const { client, receive } = setup([
      order('order-3'),
      order('order-2'),
      order('order-1'),
    ]);

    receive('orders', {
      orders: [
        order('order-1', { status: 'FILLED' }),
        order('order-2', { status: 'CANCELED' }),
      ],
    });

    expect(
      client.getQueryData<AccountOrder[]>(openOrdersQueryKey)?.map((o) => o.id),
    ).toEqual(['order-3']);
  });

  it('대기 주문을 아직 받지 않았으면 일부만으로 목록을 만들지 않는다', () => {
    const { client, receive } = setup();

    receive('orders', { orders: [order('order-1')] });

    expect(client.getQueryData(openOrdersQueryKey)).toBeUndefined();
  });

  it('다시 연결되면 대기 주문을 낡은 것으로 표시해 다시 받게 한다', () => {
    const { client, receive } = setup([order('order-1')]);

    receive('connect');

    expect(client.getQueryState(openOrdersQueryKey)?.isInvalidated).toBe(true);
  });
});
