import { describe, expect, it } from 'vitest';
import { SYMBOLS } from './market.js';
import { MARKET_SPECS } from './market-specs.js';

describe('MARKET_SPECS', () => {
  it('지원하는 모든 종목의 규칙이 있다', () => {
    for (const symbol of SYMBOLS) {
      expect(MARKET_SPECS[symbol]).toBeDefined();
    }
  });
});
