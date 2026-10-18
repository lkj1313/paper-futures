import type {
  PlaceOrderRequest,
  PlaceOrderResponse,
} from '@paper-futures/shared';
import { useMutation } from '@tanstack/react-query';
import { http } from '@/shared/api/http';
import { notifyError } from '@/shared/lib/notify-error';

export function usePlaceOrder() {
  return useMutation({
    mutationFn: (request: PlaceOrderRequest) =>
      http.post<PlaceOrderResponse>('/orders', request).then((res) => res.data),
    onError: notifyError,
  });
}
