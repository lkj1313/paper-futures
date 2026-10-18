import {
  type AccountPosition,
  type MarketSymbol,
  toPositionLiveValues,
} from '@paper-futures/shared';
import { useMark, useMarketSubscription } from '@/entities/market';
import { ClosePositionControls } from '@/features/close-position';
import { useNow } from '@/shared/lib/use-now';
import { PositionRowView } from './PositionRowView';

export function PositionRow({
  symbol,
  position,
}: {
  symbol: MarketSymbol;
  position: AccountPosition;
}) {
  useMarketSubscription(symbol);
  const mark = useMark(symbol);
  const now = useNow(1000);

  return (
    <PositionRowView
      symbol={symbol}
      position={position}
      live={toPositionLiveValues(position, mark, now)}
      closeSlot={
        <ClosePositionControls
          symbol={symbol}
          side={position.side}
          qty={position.qty}
          markPrice={mark?.markPrice}
        />
      }
    />
  );
}
