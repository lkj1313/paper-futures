import type {
  AccountOrder,
  AmendOrderRequest,
  MarketSymbol,
  PlaceOrderResponse,
} from '@paper-futures/shared';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { http } from '@/shared/api/http';
import { formatPrice, formatQty } from '@/shared/lib/format';
import { notifyError } from '@/shared/lib/notify-error';

interface AmendOrderVariables extends AmendOrderRequest {
  id: string;
  symbol: MarketSymbol;
}

function amendedMessage(symbol: MarketSymbol, order: AccountOrder) {
  if (order.status === 'FILLED') {
    const side = order.side === 'BUY' ? '매수' : '매도';
    return `${symbol} ${formatQty(symbol, order.qty)} ${side} 체결 (평균 ${formatPrice(symbol, order.avgFillPrice ?? '0')})`;
  }
  return `주문 가격을 바꿨습니다 (${formatPrice(symbol, order.price ?? '0')})`;
}

export function useAmendOrder() {
  return useMutation({
    mutationFn: ({ id, price }: AmendOrderVariables) =>
      http
        .patch<PlaceOrderResponse>(`/orders/${id}`, {
          price,
        } satisfies AmendOrderRequest)
        .then((res) => res.data),
    onSuccess: ({ order }, { symbol }) =>
      toast.success(amendedMessage(symbol, order)),
    onError: notifyError,
  });
}
