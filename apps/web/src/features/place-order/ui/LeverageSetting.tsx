import type { MarketSymbol } from '@paper-futures/shared';
import { useLeverage } from '@/entities/leverage';
import { usePosition } from '@/entities/position';
import { useIsLoggedIn } from '@/entities/session';
import { useUpdateLeverage } from '../api/use-update-leverage';
import { LeverageControl } from './LeverageControl';

export function LeverageSetting({ symbol }: { symbol: MarketSymbol }) {
  const isLoggedIn = useIsLoggedIn();
  const saved = useLeverage(symbol);
  const position = usePosition(symbol);
  const update = useUpdateLeverage();

  return (
    <LeverageControl
      symbol={symbol}
      value={saved}
      locked={position?.leverage}
      saving={update.isPending}
      disabledReason={isLoggedIn ? undefined : '로그인하면 바꿀 수 있습니다'}
      onConfirm={(leverage) => update.mutateAsync({ symbol, leverage })}
    />
  );
}
