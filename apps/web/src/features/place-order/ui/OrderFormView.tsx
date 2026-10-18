import type {
  MarketSymbol,
  OrderSide,
  PlaceableOrderType,
} from '@paper-futures/shared';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { sanitizeDecimal } from '@/shared/lib/decimal-input';
import { formatQty, formatUsdt } from '@/shared/lib/format';
import { baseAssetOf } from '@/shared/lib/symbol';
import { cn } from '@/shared/lib/utils';
import { Button, buttonVariants } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import type { OrderSummary, SideSummary } from '../lib/order-summary';

const PERCENTS = [25, 50, 75, 100];

const SIDES = [
  { side: 'BUY', label: '매수 / 롱', tone: 'bg-up hover:bg-up/90' },
  { side: 'SELL', label: '매도 / 숏', tone: 'bg-down hover:bg-down/90' },
] as const;

export interface OrderFormViewProps {
  symbol: MarketSymbol;
  type: PlaceableOrderType;
  price: string;
  qty: string;
  reduceOnly: boolean;
  available?: string;
  summary: OrderSummary;
  loggedIn: boolean;
  submitting: OrderSide | null;
  leverageSlot?: ReactNode;
  onTypeChange: (type: PlaceableOrderType) => void;
  onPriceChange: (price: string) => void;
  onQtyChange: (qty: string) => void;
  onPercent: (percent: number) => void;
  onReduceOnlyChange: (reduceOnly: boolean) => void;
  onSubmit: (side: OrderSide) => void;
}

export function OrderFormView({
  symbol,
  type,
  price,
  qty,
  reduceOnly,
  available,
  summary,
  loggedIn,
  submitting,
  leverageSlot,
  onTypeChange,
  onPriceChange,
  onQtyChange,
  onPercent,
  onReduceOnlyChange,
  onSubmit,
}: OrderFormViewProps) {
  return (
    <div className="flex flex-col gap-3 p-3 text-sm">
      {leverageSlot && <div className="flex">{leverageSlot}</div>}
      <Tabs
        value={type}
        onValueChange={(value) => onTypeChange(value as PlaceableOrderType)}
      >
        <TabsList variant="line">
          <TabsTrigger value="LIMIT">지정가</TabsTrigger>
          <TabsTrigger value="MARKET">시장가</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">주문 가능</span>
        <span className="tabular-nums">
          {available ? formatUsdt(available) : '--'} USDT
        </span>
      </div>
      {type === 'LIMIT' && (
        <DecimalField
          id="order-price"
          label="가격"
          unit="USDT"
          value={price}
          onChange={onPriceChange}
        />
      )}
      <DecimalField
        id="order-qty"
        label="수량"
        unit={baseAssetOf(symbol)}
        value={qty}
        onChange={onQtyChange}
      />
      <div className="grid grid-cols-4 gap-1">
        {PERCENTS.map((percent) => (
          <Button
            key={percent}
            variant="outline"
            size="xs"
            onClick={() => onPercent(percent)}
          >
            {percent}%
          </Button>
        ))}
      </div>
      <Label className="text-xs font-normal">
        <Checkbox
          checked={reduceOnly}
          onCheckedChange={(checked) => onReduceOnlyChange(checked === true)}
        />
        포지션 줄이기만 (reduceOnly)
      </Label>
      {loggedIn ? (
        <div className="grid grid-cols-2 gap-2">
          {SIDES.map(({ side, label, tone }) => (
            <div key={side} className="flex flex-col gap-1.5">
              <Button
                className={cn('text-white', tone)}
                disabled={submitting !== null}
                onClick={() => onSubmit(side)}
              >
                {submitting === side ? '주문 중…' : label}
              </Button>
              <SideInfo symbol={symbol} summary={summary[side]} />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Link to="/login" className={buttonVariants()}>
            로그인
          </Link>
          <Link to="/signup" className={buttonVariants({ variant: 'outline' })}>
            회원가입
          </Link>
        </div>
      )}
    </div>
  );
}

function DecimalField({
  id,
  label,
  unit,
  value,
  onChange,
}: {
  id: string;
  label: string;
  unit: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          value={value}
          onChange={(event) => onChange(sanitizeDecimal(event.target.value))}
          className="pr-14 text-right tabular-nums"
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
          {unit}
        </span>
      </div>
    </div>
  );
}

function SideInfo({
  symbol,
  summary,
}: {
  symbol: MarketSymbol;
  summary: SideSummary;
}) {
  return (
    <div className="flex flex-col text-xs text-muted-foreground tabular-nums">
      <span>
        {summary.cost === null
          ? '포지션 정리'
          : `비용 ${formatUsdt(summary.cost)} USDT`}
      </span>
      <span>
        최대 {formatQty(symbol, summary.maxQty)} {baseAssetOf(symbol)}
      </span>
    </div>
  );
}
