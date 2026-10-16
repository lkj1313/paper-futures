import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { useMarketStore } from '@/entities/market/model/market-store';
import { setSessionExpiredHandler } from '@/shared/api/session-expired';
import { useTokenStore } from '@/shared/api/token-store';
import { server } from './server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

afterEach(() => {
  cleanup();
  server.resetHandlers();
  useTokenStore.setState({ accessToken: null });
  useMarketStore.setState({ bySymbol: {} });
  setSessionExpiredHandler(() => {});
});

afterAll(() => server.close());
