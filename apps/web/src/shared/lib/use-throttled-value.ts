import { throttle } from 'es-toolkit';
import { useEffect, useMemo, useRef, useState } from 'react';

export function useThrottledValue<T>(value: T, wait: number) {
  const [throttled, setThrottled] = useState(value);
  const lastValue = useRef(value);

  const update = useMemo(
    () => throttle((next: T) => setThrottled(() => next), wait),
    [wait],
  );

  useEffect(() => {
    if (Object.is(lastValue.current, value)) return;
    lastValue.current = value;
    update(value);
  }, [value, update]);

  useEffect(() => () => update.cancel(), [update]);

  return throttled;
}
