import { describe, expect, it } from 'vitest';
import { toneOf } from './tone';

describe('toneOf', () => {
  it('양수는 상승색, 음수는 하락색, 0은 색 없음', () => {
    expect(toneOf('5')).toBe('text-up');
    expect(toneOf('-0.01')).toBe('text-down');
    expect(toneOf('0')).toBeUndefined();
  });
});
