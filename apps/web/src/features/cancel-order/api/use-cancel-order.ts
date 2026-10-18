import { type AccountOrder, isMarketSymbol } from '@paper-futures/shared';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { http } from '@/shared/api/http';
import { formatPrice } from '@/shared/lib/format';
import { notifyError } from '@/shared/lib/notify-error';

function canceledMessage({ symbol, side, price }: AccountOrder) {
  const sideLabel = side === 'BUY' ? '매수' : '매도';
  const shownPrice =
    price && isMarketSymbol(symbol) ? formatPrice(symbol, price) : price;
  return `지정가 ${sideLabel} 주문을 취소했습니다 (${shownPrice})`;
}

export function useCancelOrder() {
  return useMutation({
    mutationFn: (id: string) =>
      http.delete<AccountOrder>(`/orders/${id}`).then((res) => res.data),
    onSuccess: (order) => toast.success(canceledMessage(order)),
    onError: notifyError,
  });
}
