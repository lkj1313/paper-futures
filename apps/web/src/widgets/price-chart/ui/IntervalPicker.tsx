import { CANDLE_INTERVALS, type CandleInterval } from '@paper-futures/shared';
import { cn } from '@/shared/lib/utils';

const LABEL: Record<CandleInterval, string> = {
  '1m': '1분',
  '5m': '5분',
  '15m': '15분',
  '1h': '1시간',
  '4h': '4시간',
  '1d': '1일',
};

export function IntervalPicker({
  value,
  onChange,
}: {
  value: CandleInterval;
  onChange: (interval: CandleInterval) => void;
}) {
  return (
    <div role="group" aria-label="봉 간격" className="flex gap-1">
      {CANDLE_INTERVALS.map((interval) => (
        <button
          key={interval}
          type="button"
          aria-pressed={interval === value}
          onClick={() => onChange(interval)}
          className={cn(
            'rounded px-2 py-0.5 text-xs',
            interval === value
              ? 'bg-muted text-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {LABEL[interval]}
        </button>
      ))}
    </div>
  );
}
