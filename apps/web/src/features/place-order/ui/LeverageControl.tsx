import type { MarketSymbol } from '@paper-futures/shared';
import { ChevronDown, Lock } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/shared/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/shared/ui/popover';
import { LeverageSlider } from './LeverageSlider';

export interface LeverageControlProps {
  symbol: MarketSymbol;
  value: number;
  locked?: number;
  saving?: boolean;
  disabledReason?: string;
  onConfirm: (leverage: number) => Promise<unknown>;
}

export function LeverageControl({
  symbol,
  value,
  locked,
  saving = false,
  disabledReason,
  onConfirm,
}: LeverageControlProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);

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

  const changeOpen = (next: boolean) => {
    if (next) setDraft(value);
    setOpen(next);
  };

  const confirm = () => {
    if (draft === value) {
      setOpen(false);
      return;
    }
    onConfirm(draft).then(
      () => setOpen(false),
      () => undefined,
    );
  };

  return (
    <Popover open={open} onOpenChange={changeOpen}>
      <PopoverTrigger render={<Button variant="outline" size="sm" />}>
        {value}x
        <ChevronDown />
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <PopoverHeader>
          <PopoverTitle>레버리지 조정</PopoverTitle>
        </PopoverHeader>
        <LeverageSlider symbol={symbol} value={draft} onChange={setDraft} />
        {disabledReason ? (
          <p className="text-xs text-muted-foreground">{disabledReason}</p>
        ) : (
          <Button onClick={confirm} disabled={saving}>
            {saving ? '저장 중…' : '확인'}
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
