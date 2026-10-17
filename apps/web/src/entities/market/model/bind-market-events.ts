import type { RealtimeSocket } from '@/shared/socket';
import { useMarketStore } from './market-store';

export function bindMarketEvents(socket: RealtimeSocket) {
  const { applyTrades, applyMark, applyDepth, applyTicker } =
    useMarketStore.getState();
  socket.on('trades', applyTrades);
  socket.on('mark', applyMark);
  socket.on('depth', applyDepth);
  socket.on('ticker', applyTicker);
}
