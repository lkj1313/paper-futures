import { describe, expect, it } from 'vitest';
import { closeOrderRequest } from './close-order';

describe('closeOrderRequest', () => {
  it('롱은 매도 시장가 reduceOnly로 닫고, 가격은 보내지 않는다', () => {
    expect(
      closeOrderRequest(
        { symbol: 'BTCUSDT', side: 'LONG' },
        { type: 'MARKET', qty: '0.010', price: '81500.0' },
      ),
    ).toEqual({
      symbol: 'BTCUSDT',
      side: 'SELL',
      type: 'MARKET',
      qty: '0.010',
      reduceOnly: true,
    });
  });

  it('숏은 매수 지정가 reduceOnly로 닫고, 가격을 함께 보낸다', () => {
    expect(
      closeOrderRequest(
        { symbol: 'ETHUSDT', side: 'SHORT' },
        { type: 'LIMIT', qty: '0.5', price: '2600.00' },
      ),
    ).toEqual({
      symbol: 'ETHUSDT',
      side: 'BUY',
      type: 'LIMIT',
      qty: '0.5',
      price: '2600.00',
      reduceOnly: true,
    });
  });
});
