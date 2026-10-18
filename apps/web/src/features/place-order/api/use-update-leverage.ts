import type {
  LeverageSettings,
  MarketSymbol,
  UpdateLeverageRequest,
  UpdateLeverageResponse,
} from '@paper-futures/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { leverageQueryKey } from '@/entities/leverage';
import { http } from '@/shared/api/http';
import { notifyError } from '@/shared/lib/notify-error';

export function useUpdateLeverage() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: ({
      symbol,
      leverage,
    }: {
      symbol: MarketSymbol;
      leverage: number;
    }) =>
      http
        .put<UpdateLeverageResponse>(`/leverage/${symbol}`, {
          leverage,
        } satisfies UpdateLeverageRequest)
        .then((res) => res.data),
    onSuccess: ({ symbol, leverage }) => {
      client.setQueryData<LeverageSettings>(
        leverageQueryKey,
        (settings) => settings && { ...settings, [symbol]: leverage },
      );
      toast.success(`${symbol} 레버리지를 ${leverage}배로 바꿨습니다`);
    },
    onError: notifyError,
  });
}
