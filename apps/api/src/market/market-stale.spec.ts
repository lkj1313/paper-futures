import { isStale, MARKET_DATA_STALE_MS } from '@paper-futures/shared';

describe('isStale', () => {
  const now = 1_000_000;

  it('받은 지 5초 이내면 최신', () => {
    expect(isStale(now - 4_900, now)).toBe(false);
    expect(isStale(now - MARKET_DATA_STALE_MS, now)).toBe(false);
  });

  it('받은 지 5초가 넘으면 오래된 시세', () => {
    expect(isStale(now - 5_100, now)).toBe(true);
  });

  it('한 번도 받은 적 없으면 오래된 시세', () => {
    expect(isStale(undefined, now)).toBe(true);
  });
});
