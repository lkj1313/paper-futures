import { MARKET_SPECS, type MarketSymbol } from '@paper-futures/shared';
import { Minus, Plus } from 'lucide-react';
import { useEffect } from 'react';
import { Button } from '@/shared/ui/button';
import { Slider } from '@/shared/ui/slider';

const MARK_STEP = 25;

export interface LeverageSliderProps {
  symbol: MarketSymbol;
  value: number;
  onChange: (leverage: number) => void;
}

export function LeverageSlider({
  symbol,
  value,
  onChange,
}: LeverageSliderProps) {
  const max = MARKET_SPECS[symbol].maxLeverage;
  const marks = [
    1,
    ...Array.from(
      { length: Math.floor(max / MARK_STEP) },
      (_, i) => (i + 1) * MARK_STEP,
    ),
  ];

  useEffect(() => {
    if (value > max) onChange(max);
  }, [value, max, onChange]);

  const change = (next: number) => onChange(Math.min(max, Math.max(1, next)));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="레버리지 낮추기"
          disabled={value <= 1}
          onClick={() => change(value - 1)}
        >
          <Minus />
        </Button>
        <span className="text-lg font-semibold tabular-nums">{value}x</span>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="레버리지 높이기"
          disabled={value >= max}
          onClick={() => change(value + 1)}
        >
          <Plus />
        </Button>
      </div>
      <Slider
        min={1}
        max={max}
        step={1}
        value={[Math.min(value, max)]}
        onValueChange={(next) => change(Array.isArray(next) ? next[0] : next)}
      />
      <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
        {marks.map((mark) => (
          <span key={mark}>{mark}x</span>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        레버리지가 높을수록 청산 위험이 커집니다
      </p>
    </div>
  );
}
