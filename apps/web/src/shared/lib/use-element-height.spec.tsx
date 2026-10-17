import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FakeResizeObserver } from '@/test/resize-observer';
import { useElementHeight } from './use-element-height';

function Probe() {
  const [ref, height] = useElementHeight<HTMLDivElement>();
  return <div ref={ref}>{height ?? '모름'}</div>;
}

afterEach(() => {
  vi.unstubAllGlobals();
  FakeResizeObserver.last = undefined;
});

describe('useElementHeight', () => {
  it('요소 높이를 재고, 크기가 바뀌면 새 높이를 준다', () => {
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    render(<Probe />);
    expect(screen.getByText('모름')).toBeInTheDocument();

    act(() => FakeResizeObserver.last?.resize(120));
    expect(screen.getByText('120')).toBeInTheDocument();

    act(() => FakeResizeObserver.last?.resize(300));
    expect(screen.getByText('300')).toBeInTheDocument();
  });

  it('화면에서 사라지면 재기를 멈춘다', () => {
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    const { unmount } = render(<Probe />);
    const observer = FakeResizeObserver.last;
    expect(observer?.observe).toHaveBeenCalledOnce();

    unmount();

    expect(observer?.disconnect).toHaveBeenCalledOnce();
  });

  it('높이를 잴 수 없는 환경이면 모른다고 둔다', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    render(<Probe />);

    expect(screen.getByText('모름')).toBeInTheDocument();
  });
});
