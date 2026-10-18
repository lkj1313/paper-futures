import type { AccountPosition } from '@paper-futures/shared';
import { describe, expect, it } from 'vitest';
import { checkOrder, maxOrderQty, orderCost, qtyByPercent } from './order-math';

const btcLong = (qty: string, leverage = 10): AccountPosition => ({
  symbol: 'BTCUSDT',
  side: 'LONG',
  qty,
  entryPrice: '81565.0',
  leverage,
  isolatedMargin: '81.565',
  liquidationPrice: '73734.76',
});

describe('orderCost', () => {
  it('지정가는 증거금에 메이커 수수료를 더한다', () => {
    expect(
      orderCost({ qty: '0.002', price: '50000', leverage: 10, type: 'LIMIT' }),
    ).toEqual({ margin: '10', fee: '0.02', total: '10.02' });
  });

  it('서버처럼 증거금과 수수료를 소수 8자리로 반올림해서 더한다', () => {
    expect(
      orderCost({ qty: '0.007', price: '2426.53', leverage: 3, type: 'LIMIT' }),
    ).toEqual({ margin: '5.66190333', fee: '0.00339714', total: '5.66530047' });
  });

  it('시장가는 테이커 수수료를 쓴다', () => {
    expect(
      orderCost({ qty: '0.01', price: '81565', leverage: 10, type: 'MARKET' }),
    ).toEqual({ margin: '81.565', fee: '0.407825', total: '81.972825' });
  });
});

describe('maxOrderQty', () => {
  const base = {
    symbol: 'BTCUSDT',
    type: 'MARKET',
    price: '81565',
    leverage: 10,
    available: '10000',
  } as const;

  it('포지션이 없으면 주문 가능 금액으로 살 수 있는 만큼을 수량 단위로 내린다', () => {
    expect(maxOrderQty({ ...base, side: 'BUY' })).toBe('1.219');
    expect(maxOrderQty({ ...base, side: 'SELL' })).toBe('1.219');
  });

  it('롱이 있으면 매도 최대는 포지션 수량이다 (뒤집기는 안 되므로)', () => {
    expect(
      maxOrderQty({ ...base, side: 'SELL', position: btcLong('0.01') }),
    ).toBe('0.01');
  });

  it('포지션이 있으면 늘리는 쪽은 포지션의 레버리지로 계산한다', () => {
    expect(
      maxOrderQty({ ...base, side: 'BUY', position: btcLong('0.01', 5) }),
    ).toBe('0.611');
  });

  it('주문 가능 금액이나 가격이 없으면 0', () => {
    expect(maxOrderQty({ ...base, side: 'BUY', available: '0' })).toBe('0');
    expect(maxOrderQty({ ...base, side: 'BUY', price: '0' })).toBe('0');
  });
});

describe('qtyByPercent', () => {
  it('최대 수량의 비율을 수량 단위로 내린다', () => {
    expect(qtyByPercent('BTCUSDT', '1.219', 25)).toBe('0.304');
    expect(qtyByPercent('BTCUSDT', '1.219', 50)).toBe('0.609');
    expect(qtyByPercent('BTCUSDT', '1.219', 100)).toBe('1.219');
  });
});

describe('checkOrder', () => {
  const order = {
    symbol: 'BTCUSDT',
    side: 'BUY',
    type: 'LIMIT',
    qty: '0.002',
    price: '81565.0',
  } as const;

  it('규칙에 맞으면 null', () => {
    expect(checkOrder(order)).toBeNull();
  });

  it('수량이 비었거나 0이거나 수량 단위에 맞지 않으면 거부한다', () => {
    const message = '수량은 0.001 단위의 0보다 큰 값이어야 합니다.';
    expect(checkOrder({ ...order, qty: '' })).toBe(message);
    expect(checkOrder({ ...order, qty: '0' })).toBe(message);
    expect(checkOrder({ ...order, qty: '0.0015' })).toBe(message);
  });

  it('지정가가 호가 단위에 맞지 않으면 거부한다', () => {
    expect(checkOrder({ ...order, price: '81565.05' })).toBe(
      '가격은 0.1 단위의 0보다 큰 값이어야 합니다.',
    );
    expect(checkOrder({ ...order, price: '' })).toBe(
      '가격은 0.1 단위의 0보다 큰 값이어야 합니다.',
    );
  });

  it('열거나 늘리는 주문은 최소 주문 금액보다 작으면 거부한다', () => {
    expect(checkOrder({ ...order, qty: '0.001' })).toBe(
      '최소 주문 금액은 100 USDT입니다.',
    );
    expect(
      checkOrder({
        ...order,
        symbol: 'ETHUSDT',
        qty: '0.008',
        price: '2426.52',
      }),
    ).toBe('최소 주문 금액은 20 USDT입니다.');
  });

  it('포지션을 줄이는 주문은 최소 주문 금액을 따지지 않는다', () => {
    expect(
      checkOrder({
        ...order,
        side: 'SELL',
        qty: '0.001',
        position: btcLong('0.001'),
      }),
    ).toBeNull();
  });
});
