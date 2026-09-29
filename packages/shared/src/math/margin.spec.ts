import { describe, expect, it } from 'vitest';
import {
  initialMargin,
  maintenanceMargin,
  notional,
  tradingFee,
} from './margin.js';

// 예시: BTC 83,000에 0.1개, 레버리지 10배, 유지증거금률 0.4%
describe('증거금 계산', () => {
  it('명목가치 = 수량 × 가격', () => {
    expect(notional('0.1', '83000').toString()).toBe('8300');
  });

  it('개시증거금 = 명목가치 ÷ 레버리지', () => {
    expect(initialMargin('8300', 10).toString()).toBe('830');
    expect(initialMargin('8300', 125).toString()).toBe('66.4');
  });

  it('유지증거금 = 명목가치 × 유지증거금률', () => {
    expect(maintenanceMargin('8300', '0.004').toString()).toBe('33.2');
  });

  it('수수료 = 명목가치 × 수수료율', () => {
    expect(tradingFee('8300', '0.0005').toString()).toBe('4.15'); // 테이커
    expect(tradingFee('8300', '0.0002').toString()).toBe('1.66'); // 메이커
  });
});
