import type { AccountWallet, DepositRequest } from '@paper-futures/shared';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { http } from '@/shared/api/http';
import { formatUsdt } from '@/shared/lib/format';
import { notifyError } from '@/shared/lib/notify-error';

export function useDeposit() {
  return useMutation({
    mutationFn: (request: DepositRequest) =>
      http
        .post<AccountWallet>('/wallet/deposit', request)
        .then((res) => res.data),
    onSuccess: (_wallet, { amount }) =>
      toast.success(`${formatUsdt(amount)} USDT를 충전했습니다`),
    onError: notifyError,
  });
}
