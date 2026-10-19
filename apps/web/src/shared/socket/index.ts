import { REALTIME_PATH } from '@paper-futures/shared';
import { io } from 'socket.io-client';
import { createRealtime, type RealtimeSocket } from './realtime';

export const socket: RealtimeSocket = io({
  path: REALTIME_PATH,
  autoConnect: false,
});

export const {
  subscribeMarket,
  unsubscribeMarket,
  subscribeCandles,
  unsubscribeCandles,
} = createRealtime(socket);
export type { RealtimeSocket } from './realtime';
