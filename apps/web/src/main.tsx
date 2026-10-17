import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';
import { bindMarketEvents } from '@/entities/market';
import { socket } from '@/shared/socket';

bindMarketEvents(socket);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
