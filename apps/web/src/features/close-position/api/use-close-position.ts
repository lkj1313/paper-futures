import type {
  AccountOrder,
  MarketSymbol,
  PlaceOrderRequest,
  PlaceOrderResponse,
} from '@paper-futures/shared';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { http } from '@/shared/api/http';
import { formatPrice, formatQty } from '@/shared/lib/format';
import { notifyError } from '@/shared/lib/notify-error';

function closedMessage(symbol: MarketSymbol, order: AccountOrder) {
  if (order.status === 'NEW') {
    return `지정가 닫기 주문을 넣었습니다 (${formatPrice(symbol, order.price ?? '0')})`;
  }
  return `${symbol} ${formatQty(symbol, order.qty)} 포지션 정리 (평균 ${formatPrice(symbol, order.avgFillPrice ?? '0')})`;
}

export function useClosePosition() {
  return useMutation({
    mutationFn: (request: PlaceOrderRequest) =>
      http.post<PlaceOrderResponse>('/orders', request).then((res) => res.data),
    onSuccess: ({ order }, { symbol }) =>
      toast.success(closedMessage(symbol, order)),
    onError: notifyError,
  });
}
