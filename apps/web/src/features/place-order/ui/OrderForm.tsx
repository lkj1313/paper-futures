import {
  type AccountOrder,
  type MarketSymbol,
  type OrderSide,
  type PlaceableOrderType,
  type PlaceOrderRequest,
} from '@paper-futures/shared';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useLeverage } from '@/entities/leverage';
import { useDepth, useRecentTrades } from '@/entities/market';
import { usePosition } from '@/entities/position';
import { useIsLoggedIn } from '@/entities/session';
import { useWallet } from '@/entities/wallet';
import { formatPrice, formatQty } from '@/shared/lib/format';
import { toTickPrice } from '@/shared/lib/price';
import { usePlaceOrder } from '../api/use-place-order';
import { checkOrder, qtyByPercent } from '../lib/order-math';
import { buildOrderSummary } from '../lib/order-summary';
import { useOrderDraft } from '../model/order-draft-store';
import { LeverageSetting } from './LeverageSetting';
import { OrderFormView } from './OrderFormView';

const SIDE_LABEL = { BUY: '매수', SELL: '매도' } as const;

function placedMessage(symbol: MarketSymbol, order: AccountOrder) {
  const side = SIDE_LABEL[order.side];
  if (order.status === 'NEW') {
    return `지정가 ${side} 주문을 넣었습니다 (${formatPrice(symbol, order.price ?? '0')})`;
  }
  return `${symbol} ${formatQty(symbol, order.qty)} ${side} 체결 (평균 ${formatPrice(symbol, order.avgFillPrice ?? '0')})`;
}

export function OrderForm({ symbol }: { symbol: MarketSymbol }) {
  const loggedIn = useIsLoggedIn();
  const { data: wallet } = useWallet();
  const position = usePosition(symbol);
  const savedLeverage = useLeverage(symbol);
  const depth = useDepth(symbol);
  const trades = useRecentTrades(symbol);
  const {
    type,
    price,
    qty,
    reduceOnly,
    setType,
    setPrice,
    setQty,
    setReduceOnly,
    reset,
  } = useOrderDraft();
  const place = usePlaceOrder();
  const lastPrice = trades[0]?.price;
  const prefilledFor = useRef<MarketSymbol | null>(null);

  useEffect(() => {
    reset();
  }, [symbol, reset]);

  useEffect(() => {
    if (prefilledFor.current === symbol || !lastPrice) return;
    prefilledFor.current = symbol;
    const draft = useOrderDraft.getState();
    if (draft.type === 'LIMIT' && draft.price === '') {
      setPrice(toTickPrice(symbol, lastPrice));
    }
  }, [symbol, lastPrice, setPrice]);

  const summary = buildOrderSummary({
    symbol,
    type,
    price,
    qty,
    available: wallet?.availableBalance,
    savedLeverage,
    position,
    bestBid: depth?.bids[0]?.[0],
    bestAsk: depth?.asks[0]?.[0],
    lastPrice,
  });

  const changeType = (next: PlaceableOrderType) => {
    setType(next);
    if (next === 'LIMIT' && price === '' && lastPrice) {
      setPrice(toTickPrice(symbol, lastPrice));
    }
  };

  const submit = (side: OrderSide) => {
    const problem = checkOrder({
      symbol,
      side,
      type,
      qty,
      price: summary[side].referencePrice ?? '',
      position,
    });
    if (problem) {
      toast.error(problem);
      return;
    }

    const request: PlaceOrderRequest = {
      symbol,
      side,
      type,
      qty,
      ...(type === 'LIMIT' && { price }),
      ...(reduceOnly && { reduceOnly }),
    };
    place.mutate(request, {
      onSuccess: ({ order }) => {
        toast.success(placedMessage(symbol, order));
        setQty('');
      },
    });
  };

  return (
    <OrderFormView
      symbol={symbol}
      type={type}
      price={price}
      qty={qty}
      reduceOnly={reduceOnly}
      available={wallet?.availableBalance}
      summary={summary}
      loggedIn={loggedIn}
      submitting={place.isPending ? (place.variables?.side ?? null) : null}
      leverageSlot={<LeverageSetting symbol={symbol} />}
      onTypeChange={changeType}
      onPriceChange={setPrice}
      onQtyChange={setQty}
      onPercent={(percent) =>
        setQty(
          qtyByPercent(symbol, summary[summary.openingSide].maxQty, percent),
        )
      }
      onReduceOnlyChange={setReduceOnly}
      onSubmit={submit}
    />
  );
}
