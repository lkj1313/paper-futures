import { describe, expect, it } from 'vitest';
import { candleKey, isCandleInterval } from './market.js';

describe('isCandleInterval', () => {
  it('지원하는 봉 간격만 참이다', () => {
    for (const interval of ['1m', '5m', '15m', '1h', '4h', '1d']) {
      expect(isCandleInterval(interval)).toBe(true);
    }
    for (const value of ['3m', '1w', '15M', '', 15, undefined]) {
      expect(isCandleInterval(value)).toBe(false);
    }
  });
});

describe('candleKey', () => {
  it('종목과 봉 간격으로 Redis 키이자 채널 이름을 만든다', () => {
    expect(candleKey('BTCUSDT', '15m')).toBe('market:BTCUSDT:candle:15m');
  });
});
