import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Toaster } from '@/shared/ui/sonner';

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

export function renderWithProviders(ui: ReactNode) {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      {ui}
      <Toaster theme="dark" />
    </QueryClientProvider>,
  );
}
