import type { PlaceableOrderType } from '@paper-futures/shared';
import { sanitizeDecimal } from '@/shared/lib/decimal-input';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';

export interface ClosePositionControlsViewProps {
  price: string;
  qty: string;
  closing: boolean;
  onPriceChange: (price: string) => void;
  onQtyChange: (qty: string) => void;
  onClose: (type: PlaceableOrderType) => void;
}

const FIELD_CLASS = 'h-6 px-2 text-right text-xs tabular-nums md:text-xs';

export function ClosePositionControlsView({
  price,
  qty,
  closing,
  onPriceChange,
  onQtyChange,
  onClose,
}: ClosePositionControlsViewProps) {
  return (
    <div className="flex items-center gap-1">
      <Input
        aria-label="닫기 가격"
        inputMode="decimal"
        autoComplete="off"
        value={price}
        onChange={(event) => onPriceChange(sanitizeDecimal(event.target.value))}
        className={`w-24 ${FIELD_CLASS}`}
      />
      <Input
        aria-label="닫기 수량"
        inputMode="decimal"
        autoComplete="off"
        value={qty}
        onChange={(event) => onQtyChange(sanitizeDecimal(event.target.value))}
        className={`w-20 ${FIELD_CLASS}`}
      />
      <Button
        variant="outline"
        size="xs"
        aria-label="시장가로 닫기"
        disabled={closing || qty === ''}
        onClick={() => onClose('MARKET')}
      >
        시장가
      </Button>
      <Button
        variant="outline"
        size="xs"
        aria-label="지정가로 닫기"
        disabled={closing || qty === '' || price === ''}
        onClick={() => onClose('LIMIT')}
      >
        지정가
      </Button>
    </div>
  );
}
