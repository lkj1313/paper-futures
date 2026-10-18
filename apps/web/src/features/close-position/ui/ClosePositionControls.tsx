import type {
  MarketSymbol,
  PlaceableOrderType,
  PositionSide,
} from '@paper-futures/shared';
import { useEffect, useRef, useState } from 'react';
import { toTickPrice } from '@/shared/lib/price';
import { useClosePosition } from '../api/use-close-position';
import { closeOrderRequest } from '../lib/close-order';
import { ClosePositionControlsView } from './ClosePositionControlsView';

export interface ClosePositionControlsProps {
  symbol: MarketSymbol;
  side: PositionSide;
  qty: string;
  markPrice: string | undefined;
}

export function ClosePositionControls({
  symbol,
  side,
  qty,
  markPrice,
}: ClosePositionControlsProps) {
  const [price, setPrice] = useState('');
  const [closeQty, setCloseQty] = useState(qty);
  const [positionQty, setPositionQty] = useState(qty);
  const prefilled = useRef(false);
  const close = useClosePosition();

  useEffect(() => {
    if (prefilled.current || !markPrice) return;
    prefilled.current = true;
    setPrice(toTickPrice(symbol, markPrice));
  }, [symbol, markPrice]);

  if (qty !== positionQty) {
    setPositionQty(qty);
    setCloseQty(qty);
  }

  const submit = (type: PlaceableOrderType) =>
    close.mutate(
      closeOrderRequest({ symbol, side }, { type, qty: closeQty, price }),
    );

  return (
    <ClosePositionControlsView
      price={price}
      qty={closeQty}
      closing={close.isPending}
      onPriceChange={setPrice}
      onQtyChange={setCloseQty}
      onClose={submit}
    />
  );
}
