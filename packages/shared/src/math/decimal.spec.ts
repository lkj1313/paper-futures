import { describe, expect, it } from 'vitest';
import { Decimal } from './decimal.js';

describe('Decimal', () => {
  it('JS number와 달리 소수 오차가 없다', () => {
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(new Decimal('0.1').add('0.2').toString()).toBe('0.3');
  });
});
