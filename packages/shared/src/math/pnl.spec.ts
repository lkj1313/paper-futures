import { describe, expect, it } from 'vitest';
import { roe, unrealizedPnl } from './pnl.js';

describe('unrealizedPnl', () => {
  it('롱은 가격이 오르면 이익, 내리면 손실', () => {
    expect(unrealizedPnl('LONG', '83000', '85000', '0.1').toString()).toBe(
      '200',
    );
    expect(unrealizedPnl('LONG', '83000', '81000', '0.1').toString()).toBe(
      '-200',
    );
  });

  it('숏은 반대', () => {
    expect(unrealizedPnl('SHORT', '83000', '85000', '0.1').toString()).toBe(
      '-200',
    );
    expect(unrealizedPnl('SHORT', '83000', '81000', '0.1').toString()).toBe(
      '200',
    );
  });

  it('가격이 그대로면 0', () => {
    expect(unrealizedPnl('LONG', '83000', '83000', '0.1').isZero()).toBe(true);
  });
});

describe('roe', () => {
  it('증거금 대비 수익률: 200 ÷ 830 ≈ 24.1%', () => {
    expect(roe('200', '830').toDecimalPlaces(4).toString()).toBe('0.241');
  });

  it('증거금이 0이면 0', () => {
    expect(roe('200', '0').toString()).toBe('0');
  });
});
