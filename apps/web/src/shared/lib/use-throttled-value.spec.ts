import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useThrottledValue } from './use-throttled-value';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

const setup = () =>
  renderHook(({ value }) => useThrottledValue(value, 500), {
    initialProps: { value: 0 },
  });

const wait = (ms: number) => act(() => vi.advanceTimersByTime(ms));

describe('useThrottledValue', () => {
  it('처음 값과 첫 변화는 바로 준다', () => {
    const { result, rerender } = setup();
    expect(result.current).toBe(0);

    rerender({ value: 1 });

    expect(result.current).toBe(1);
  });

  it('곧바로 또 바뀌면 기다렸다가, 변화가 멈추고 0.5초 뒤 마지막 값만 준다', () => {
    const { result, rerender } = setup();
    rerender({ value: 1 });

    wait(100);
    rerender({ value: 2 });
    wait(100);
    rerender({ value: 3 });

    wait(499);
    expect(result.current).toBe(1);

    wait(1);
    expect(result.current).toBe(3);
  });

  it('0.1초마다 바뀌어도 0.5초에 한 번만 새 값을 준다', () => {
    const { result, rerender } = setup();
    const seen = [result.current];

    for (let value = 1; value <= 10; value++) {
      rerender({ value });
      wait(100);
      if (seen.at(-1) !== result.current) seen.push(result.current);
    }
    wait(500);
    if (seen.at(-1) !== result.current) seen.push(result.current);

    expect(seen.length).toBeLessThanOrEqual(4);
    expect(seen.at(-1)).toBe(10);
  });

  it('화면에서 사라지면 기다리던 값을 버린다', () => {
    const { rerender, unmount } = setup();
    rerender({ value: 1 });
    rerender({ value: 2 });
    expect(vi.getTimerCount()).toBeGreaterThan(0);

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
