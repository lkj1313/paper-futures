import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { setSessionExpiredHandler } from '@/shared/api/session-expired';
import { useTokenStore } from '@/shared/api/token-store';
import { server } from './server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

afterEach(() => {
  cleanup();
  server.resetHandlers();
  useTokenStore.setState({ accessToken: null });
  setSessionExpiredHandler(() => {});
});

afterAll(() => server.close());
