import type { RealtimeSocket } from '@/shared/socket';

type Handler = (payload?: unknown) => void;

export function createFakeSocket() {
  const handlers = new Map<string, Handler[]>();
  const socket = {
    on(event: string, handler: Handler) {
      handlers.set(event, [...(handlers.get(event) ?? []), handler]);
      return socket;
    },
  };

  return {
    socket: socket as unknown as RealtimeSocket,
    receive(event: string, payload?: unknown) {
      for (const handler of handlers.get(event) ?? []) handler(payload);
    },
  };
}
