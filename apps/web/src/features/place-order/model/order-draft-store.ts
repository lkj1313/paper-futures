import type { PlaceableOrderType } from '@paper-futures/shared';
import { create } from 'zustand';

interface OrderDraftState {
  type: PlaceableOrderType;
  price: string;
  qty: string;
  reduceOnly: boolean;
  setType: (type: PlaceableOrderType) => void;
  setPrice: (price: string) => void;
  setQty: (qty: string) => void;
  setReduceOnly: (reduceOnly: boolean) => void;
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
  reset: () => set({ price: '', qty: '', reduceOnly: false }),
}));
