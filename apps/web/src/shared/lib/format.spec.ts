import { describe, expect, it } from 'vitest';
import {
  formatCompact,
  formatCountdown,
  formatFundingRate,
  formatPercent,
  formatPrice,
  formatQty,
  formatSignedPrice,
  formatTime,
} from './format';

describe('formatPrice', () => {
  it('종목의 호가 단위만큼 소수를 남기고 천 단위 쉼표를 찍는다', () => {
    expect(formatPrice('BTCUSDT', '83105.30')).toBe('83,105.3');
    expect(formatPrice('ETHUSDT', '2374.88411628')).toBe('2,374.88');
  });

  it('남는 소수는 반올림한다', () => {
    expect(formatPrice('BTCUSDT', '81269.55069565')).toBe('81,269.6');
    expect(formatPrice('BTCUSDT', '81269.54')).toBe('81,269.5');
  });
});

describe('formatQty', () => {
  it('종목의 수량 단위만큼 소수를 채운다', () => {
    expect(formatQty('BTCUSDT', '0.1')).toBe('0.100');
    expect(formatQty('BTCUSDT', '18.833')).toBe('18.833');
    expect(formatQty('ETHUSDT', '1234.5')).toBe('1,234.500');
  });
});

describe('formatSignedPrice', () => {
  it('양수에는 +, 음수에는 -를 붙이고 0에는 붙이지 않는다', () => {
    expect(formatSignedPrice('BTCUSDT', '-1979.00')).toBe('-1,979.0');
    expect(formatSignedPrice('BTCUSDT', '25.5')).toBe('+25.5');
    expect(formatSignedPrice('BTCUSDT', '0')).toBe('0.0');
  });
});

describe('formatPercent', () => {
  it('소수 둘째 자리까지 부호와 %를 붙인다', () => {
    expect(formatPercent('-2.377')).toBe('-2.38%');
    expect(formatPercent('1.2')).toBe('+1.20%');
  });

  it('반올림해서 0이 되면 부호를 붙이지 않는다', () => {
    expect(formatPercent('0.000')).toBe('0.00%');
    expect(formatPercent('-0.001')).toBe('0.00%');
  });
});

describe('formatFundingRate', () => {
  it('비율에 100을 곱해 소수 넷째 자리까지 %로 보여 준다', () => {
    expect(formatFundingRate('0.00003092')).toBe('0.0031%');
    expect(formatFundingRate('-0.00002539')).toBe('-0.0025%');
    expect(formatFundingRate('0.0001')).toBe('0.0100%');
  });
});

describe('formatCompact', () => {
  it('큰 수를 K, M, B로 줄인다', () => {
    expect(formatCompact('16914394569.39')).toBe('16.91B');
    expect(formatCompact('83000000')).toBe('83M');
    expect(formatCompact('206699.249')).toBe('206.7K');
  });
});

describe('formatCountdown', () => {
  it('남은 시간을 시:분:초로 보여 준다', () => {
    expect(formatCountdown(4_523_000)).toBe('01:15:23');
    expect(formatCountdown(9_500)).toBe('00:00:09');
  });

  it('이미 지났으면 0으로 보여 준다', () => {
    expect(formatCountdown(0)).toBe('00:00:00');
    expect(formatCountdown(-5_000)).toBe('00:00:00');
  });
});

describe('formatTime', () => {
  it('시각을 이 컴퓨터 시간대의 시:분:초로 보여 준다', () => {
    expect(formatTime(new Date(2026, 9, 16, 18, 57, 14).getTime())).toBe(
      '18:57:14',
    );
    expect(formatTime(new Date(2026, 9, 16, 9, 5, 3).getTime())).toBe(
      '09:05:03',
    );
  });
});
