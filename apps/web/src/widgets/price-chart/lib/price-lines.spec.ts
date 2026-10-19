import type { AccountOrder, AccountPosition } from '@paper-futures/shared';
import { LineStyle } from 'lightweight-charts';
import { describe, expect, it } from 'vitest';
import { DOWN_COLOR, UP_COLOR } from './chart-data';
import { priceLinesOf } from './price-lines';

const BTC_LONG: AccountPosition = {
  symbol: 'BTCUSDT',
  side: 'LONG',
  qty: '0.01',
  entryPrice: '81000',
  leverage: 10,
  isolatedMargin: '81',
  liquidationPrice: '73300',
};

const order = (fields: Partial<AccountOrder>): AccountOrder => ({
  id: 'order-1',
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

describe('priceLinesOf', () => {
  it('포지션이 있으면 진입가와 청산가 선을 만든다', () => {
    const lines = priceLinesOf('BTCUSDT', BTC_LONG, []);

    expect(lines).toEqual([
      expect.objectContaining({
        price: 81000,
        title: '진입 롱',
        lineStyle: LineStyle.Solid,
      }),
      expect.objectContaining({
        price: 73300,
        title: '청산',
        lineStyle: LineStyle.Dashed,
      }),
    ]);
  });

  it('청산가가 0 이하면 청산가 선은 만들지 않는다', () => {
    const lines = priceLinesOf(
      'BTCUSDT',
      { ...BTC_LONG, side: 'SHORT', liquidationPrice: '0' },
      [],
    );

    expect(lines.map((line) => line.title)).toEqual(['진입 숏']);
  });

  it('이 종목의 대기 주문마다 방향 색과 수량으로 선을 만들고, 닫기 주문은 따로 표시한다', () => {
    const lines = priceLinesOf('BTCUSDT', undefined, [
      order({}),
      order({
        id: 'order-2',
        side: 'SELL',
        price: '90000',
        qty: '0.01',
        reduceOnly: true,
      }),
      order({ id: 'order-3', symbol: 'ETHUSDT', price: '2500' }),
    ]);

    expect(lines).toEqual([
      expect.objectContaining({
        price: 70000,
        title: '매수 0.002',
        color: UP_COLOR,
        lineStyle: LineStyle.Dotted,
      }),
      expect.objectContaining({
        price: 90000,
        title: '닫기 매도 0.010',
        color: DOWN_COLOR,
      }),
    ]);
  });

  it('포지션도 대기 주문도 없으면 선이 없다', () => {
    expect(priceLinesOf('BTCUSDT', undefined, undefined)).toEqual([]);
  });
});
