import { isMarketSymbol } from '@paper-futures/shared';
import { usePositions } from '@/entities/position';
import { PositionRow } from './PositionRow';
import { PositionsTableView } from './PositionsTableView';

export function PositionsTable() {
  const { data: positions } = usePositions();

  return (
    <PositionsTableView empty={positions?.length === 0}>
      {positions?.map(
        (position) =>
          isMarketSymbol(position.symbol) && (
            <PositionRow
              key={position.symbol}
              symbol={position.symbol}
              position={position}
            />
          ),
      )}
    </PositionsTableView>
  );
}
