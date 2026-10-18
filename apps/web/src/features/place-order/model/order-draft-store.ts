import type { MarketSymbol, PlaceableOrderType } from '@paper-futures/shared';
import { create } from 'zustand';
import { toTickPrice } from '@/shared/lib/price';

interface OrderDraftState {
  type: PlaceableOrderType;
  price: string;
  qty: string;
  reduceOnly: boolean;
  setType: (type: PlaceableOrderType) => void;
  setPrice: (price: string) => void;
  setQty: (qty: string) => void;
  setReduceOnly: (reduceOnly: boolean) => void;
  pickPrice: (symbol: MarketSymbol, price: string) => void;
  reset: () => void;
}

export const useOrderDraft = create<OrderDraftState>((set) => ({
  type: 'LIMIT',
  price: '',
  qty: '',
  reduceOnly: false,
  setType: (type) => set({ type }),
  setPrice: (price) => set({ price }),
  setQty: (qty) => set({ qty }),
  setReduceOnly: (reduceOnly) => set({ reduceOnly }),
  pickPrice: (symbol, price) =>
    set({ type: 'LIMIT', price: toTickPrice(symbol, price) }),
  reset: () => set({ price: '', qty: '', reduceOnly: false }),
}));
