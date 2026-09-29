import { describe, expect, it } from 'vitest';
import { floorToStep, isMultipleOf } from './rounding.js';

describe('floorToStep', () => {
  it('단위에 맞게 내림한다', () => {
    expect(floorToStep('0.1234', '0.001').toString()).toBe('0.123');
    expect(floorToStep('0.1239', '0.001').toString()).toBe('0.123');
    expect(floorToStep('83000.19', '0.1').toString()).toBe('83000.1');
  });

  it('이미 단위에 맞으면 그대로', () => {
    expect(floorToStep('0.123', '0.001').toString()).toBe('0.123');
  });

  it('단위보다 작으면 0', () => {
    expect(floorToStep('0.0009', '0.001').toString()).toBe('0');
  });
});

describe('isMultipleOf', () => {
  it('호가 단위의 정수배인지 확인한다', () => {
    expect(isMultipleOf('83000.1', '0.1')).toBe(true);
    expect(isMultipleOf('83000.15', '0.1')).toBe(false);
    expect(isMultipleOf('2664.38', '0.01')).toBe(true);
  });
});
