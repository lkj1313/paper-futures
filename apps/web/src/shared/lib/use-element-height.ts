import { useCallback, useState } from 'react';

export function useElementHeight<T extends Element>() {
  const [height, setHeight] = useState<number | null>(null);

  const ref = useCallback((node: T | null) => {
    if (!node || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) =>
      setHeight(entry.contentRect.height),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return [ref, height] as const;
}
