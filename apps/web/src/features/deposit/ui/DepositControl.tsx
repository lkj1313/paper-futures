import { checkDepositAmount } from '@paper-futures/shared';
import { useState } from 'react';
import { sanitizeDecimal } from '@/shared/lib/decimal-input';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/shared/ui/popover';

const PRESETS = [
  { amount: '1000', label: '1,000' },
  { amount: '10000', label: '10,000' },
  { amount: '100000', label: '100,000' },
];

export interface DepositControlProps {
  saving?: boolean;
  onConfirm: (amount: string) => Promise<unknown>;
}

export function DepositControl({
  saving = false,
  onConfirm,
}: DepositControlProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const problem = draft === '' ? null : checkDepositAmount(draft);

  const changeOpen = (next: boolean) => {
    if (next) setDraft('');
    setOpen(next);
  };

  const confirm = () => {
    onConfirm(draft).then(
      () => setOpen(false),
      () => undefined,
    );
  };

  return (
    <Popover open={open} onOpenChange={changeOpen}>
      <PopoverTrigger render={<Button variant="outline" size="xs" />}>
        충전
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <PopoverHeader>
          <PopoverTitle>USDT 충전</PopoverTitle>
        </PopoverHeader>
        <div className="grid grid-cols-3 gap-1">
          {PRESETS.map(({ amount, label }) => (
            <Button
              key={amount}
              variant="outline"
              size="xs"
              onClick={() => setDraft(amount)}
            >
              {label}
            </Button>
          ))}
        </div>
        <div className="relative">
          <Input
            aria-label="충전 금액"
            inputMode="decimal"
            autoComplete="off"
            placeholder="한 번에 최대 100,000"
            value={draft}
            onChange={(event) => setDraft(sanitizeDecimal(event.target.value))}
            className="pr-14 text-right tabular-nums"
          />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
            USDT
          </span>
        </div>
        {problem && <p className="text-xs text-down">{problem}</p>}
        <Button
          onClick={confirm}
          disabled={saving || draft === '' || problem !== null}
        >
          {saving ? '충전 중…' : '확인'}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
