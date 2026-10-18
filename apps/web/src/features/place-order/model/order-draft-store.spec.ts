import { describe, expect, it } from 'vitest';
import { useOrderDraft } from './order-draft-store';

const draft = () => useOrderDraft.getState();

describe('useOrderDraft', () => {
  it('처음에는 지정가에 빈 가격·수량으로 시작한다', () => {
    expect(draft()).toMatchObject({
      type: 'LIMIT',
      price: '',
      qty: '',
      reduceOnly: false,
    });
  });

  it('비우면 가격·수량·reduceOnly만 지우고 주문 유형은 둔다', () => {
    draft().setType('MARKET');
    draft().setPrice('81565.0');
    draft().setQty('0.010');
    draft().setReduceOnly(true);

    draft().reset();

    expect(draft()).toMatchObject({
      type: 'MARKET',
      price: '',
      qty: '',
      reduceOnly: false,
    });
  });

  it('가격을 고르면 지정가로 바꾸고 가격을 호가 단위에 맞춘다 (수량은 그대로)', () => {
    draft().setType('MARKET');
    draft().setQty('0.010');

    draft().pickPrice('BTCUSDT', '81565.40');

    expect(draft()).toMatchObject({
      type: 'LIMIT',
      price: '81565.4',
      qty: '0.010',
    });

    draft().pickPrice('ETHUSDT', '2426.5');
    expect(draft().price).toBe('2426.50');
  });
});
