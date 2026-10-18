import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';
import { bindMarketEvents } from '@/entities/market';
import { bindOrderEvents } from '@/entities/order';
import { bindPositionEvents } from '@/entities/position';
import { bindWalletEvents } from '@/entities/wallet';
import { queryClient } from '@/shared/api/query-client';
import { socket } from '@/shared/socket';

bindMarketEvents(socket);
bindWalletEvents(socket, queryClient);
bindPositionEvents(socket, queryClient);
bindOrderEvents(socket, queryClient);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
