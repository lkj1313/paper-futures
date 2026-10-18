import { describe, expect, it } from 'vitest';
import { sanitizeDecimal } from './decimal-input';

describe('sanitizeDecimal', () => {
  it('숫자와 점만 남긴다', () => {
    expect(sanitizeDecimal('1a2,3 4')).toBe('1234');
  });

  it('점은 처음 것 하나만 남긴다', () => {
    expect(sanitizeDecimal('1.2.3')).toBe('1.23');
    expect(sanitizeDecimal('..5')).toBe('.5');
  });

  it('빈 값은 그대로 둔다', () => {
    expect(sanitizeDecimal('')).toBe('');
  });
});
