import { describe, expect, it } from 'vitest';
import { toTickPrice } from './price';

describe('toTickPrice', () => {
  it('가격을 그 종목 호가 단위의 자리수로 맞춘다', () => {
    expect(toTickPrice('BTCUSDT', '81565')).toBe('81565.0');
    expect(toTickPrice('ETHUSDT', '2650.5')).toBe('2650.50');
  });

  it('자리수가 넘치면 반올림한다', () => {
    expect(toTickPrice('BTCUSDT', '81565.06')).toBe('81565.1');
  });
});
