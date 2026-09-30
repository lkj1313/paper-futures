import { toDecimal } from '@paper-futures/shared';
import {
  applyIncrease,
  applyReduce,
  type PositionState,
} from './position-changes.js';

const d = toDecimal;

// 롱 0.1개, 진입가 83,000, 증거금 830 (10배)
const long: PositionState = {
  side: 'LONG',
  qty: d('0.1'),
  entryPrice: d('83000'),
  isolatedMargin: d('830'),
};
const short: PositionState = { ...long, side: 'SHORT' };
const TAKER = '0.0005';

describe('applyIncrease', () => {
  it('포지션이 없으면 체결 결과로 새로 연다', () => {
    const r = applyIncrease(
      null,
      { qty: d('0.1'), notional: d('8300.05') },
      d('830.005'),
    );

    expect(r.qty.toString()).toBe('0.1');
    expect(r.entryPrice.toString()).toBe('83000.5');
    expect(r.isolatedMargin.toString()).toBe('830.005');
  });

  it('늘리면 진입가는 가중 평균, 증거금은 합산', () => {
    // (83,000 × 0.1 + 85,000 × 0.1) ÷ 0.2 = 84,000
    const r = applyIncrease(
      long,
      { qty: d('0.1'), notional: d('8500') },
      d('850'),
    );

    expect(r.qty.toString()).toBe('0.2');
    expect(r.entryPrice.toString()).toBe('84000');
    expect(r.isolatedMargin.toString()).toBe('1680');
  });
});

describe('applyReduce', () => {
  it('롱 일부를 이익 보고 줄인다: 진입가 유지, 증거금은 비율만큼 풀림', () => {
    // 85,000에 0.04개 매도
    const r = applyReduce(long, { qty: d('0.04'), notional: d('3400') }, TAKER);

    expect(r.closed).toBe(false);
    expect(r.remainingQty.toString()).toBe('0.06');
    expect(r.releasedMargin.toString()).toBe('332'); // 830 × 0.4
    expect(r.remainingMargin.toString()).toBe('498');
    expect(r.realizedPnl.toString()).toBe('80'); // (85,000 − 83,000) × 0.04
    expect(r.fee.toString()).toBe('1.7'); // 3,400 × 0.05%
  });

  it('전부 줄이면 닫히고 증거금이 모두 풀린다', () => {
    const r = applyReduce(long, { qty: d('0.1'), notional: d('8500') }, TAKER);

    expect(r.closed).toBe(true);
    expect(r.remainingQty.isZero()).toBe(true);
    expect(r.releasedMargin.toString()).toBe('830');
    expect(r.realizedPnl.toString()).toBe('200');
  });

  it('숏은 가격이 내리면 이익, 오르면 손실', () => {
    const down = applyReduce(
      short,
      { qty: d('0.1'), notional: d('8100') },
      TAKER,
    );
    const up = applyReduce(
      short,
      { qty: d('0.1'), notional: d('8500') },
      TAKER,
    );

    expect(down.realizedPnl.toString()).toBe('200');
    expect(up.realizedPnl.toString()).toBe('-200');
  });

  it('손실 상한: 청산가를 지나쳐 닫아도 손실 + 수수료는 증거금까지만', () => {
    // 70,000에 닫으면 계산상 손실 1,300 > 증거금 830
    const r = applyReduce(long, { qty: d('0.1'), notional: d('7000') }, TAKER);

    expect(r.fee.toString()).toBe('3.5');
    expect(r.realizedPnl.toString()).toBe('-826.5');
    expect(r.realizedPnl.sub(r.fee).neg().toString()).toBe('830');
  });

  it('손실 상한은 줄이는 부분의 증거금 기준이다', () => {
    // 절반만 70,000에 줄이면 계산상 손실 650 > 풀리는 증거금 415
    const r = applyReduce(long, { qty: d('0.05'), notional: d('3500') }, TAKER);

    expect(r.releasedMargin.toString()).toBe('415');
    expect(r.realizedPnl.sub(r.fee).neg().toString()).toBe('415');
  });

  it('손실이 상한 안이면 그대로 반영한다', () => {
    const r = applyReduce(long, { qty: d('0.1'), notional: d('8200') }, TAKER);

    expect(r.realizedPnl.toString()).toBe('-100');
    expect(r.fee.toString()).toBe('4.1');
  });
});
