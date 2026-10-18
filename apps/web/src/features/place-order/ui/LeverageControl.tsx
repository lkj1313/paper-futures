import { ChevronDown, Lock } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/shared/ui/popover';
import { LeverageSlider, type LeverageSliderProps } from './LeverageSlider';

export function LeverageControl({
  symbol,
  value,
  onChange,
  locked,
}: LeverageSliderProps & { locked?: number }) {
  if (locked !== undefined) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled>
          {locked}x
          <Lock />
        </Button>
        <span className="text-xs text-muted-foreground">
          {symbol} 포지션이 열려 있어 {locked}배로 고정됩니다
        </span>
      </div>
    );
  }

  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" size="sm" />}>
        {value}x
        <ChevronDown />
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <PopoverHeader>
          <PopoverTitle>레버리지 조정</PopoverTitle>
        </PopoverHeader>
        <LeverageSlider symbol={symbol} value={value} onChange={onChange} />
      </PopoverContent>
    </Popover>
  );
}
