import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNow } from './use-now';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-17T00:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useNow', () => {
  it('지금 시각을 주고, 주기마다 새 시각으로 다시 그린다', () => {
    const start = Date.now();
    const { result } = renderHook(() => useNow(1000));
    expect(result.current).toBe(start);

    act(() => vi.advanceTimersByTime(1000));
    expect(result.current).toBe(start + 1000);

    act(() => vi.advanceTimersByTime(2000));
    expect(result.current).toBe(start + 3000);
  });

  it('화면에서 사라지면 타이머를 멈춘다', () => {
    const { unmount } = renderHook(() => useNow(1000));
    expect(vi.getTimerCount()).toBe(1);

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
