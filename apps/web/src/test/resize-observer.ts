import { vi } from 'vitest';

export class FakeResizeObserver {
  static last: FakeResizeObserver | undefined;
  observe = vi.fn();
  disconnect = vi.fn();
  private readonly callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    FakeResizeObserver.last = this;
  }

  resize(height: number) {
    this.callback(
      [{ contentRect: { height } } as ResizeObserverEntry],
      this as unknown as ResizeObserver,
    );
  }
}
