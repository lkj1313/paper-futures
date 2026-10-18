import type { AccountLedgerEntry } from '@paper-futures/shared';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { useTokenStore } from '@/shared/api/token-store';
import { createTestQueryClient } from '@/test/render';
import { server } from '@/test/server';
import { useLedger } from './use-ledger';

const entry = (id: string): AccountLedgerEntry => ({
  id,
  type: 'TRADING_FEE',
  amount: '-0.4078255',
  balanceAfter: '9999.5921745',
  createdAt: '2026-10-18T00:00:00.000Z',
});

function createWrapper() {
  const client = createTestQueryClient();
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

describe('useLedger', () => {
  it('로그인 전에는 요청하지 않는다', () => {
    const { result } = renderHook(() => useLedger(), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
  });

  it('최신 기록부터 받고, 더 보기를 하면 다음 커서로 이어 받아 뒤에 붙인다', async () => {
    const cursors: (string | null)[] = [];
    server.use(
      http.get('/api/wallet/ledger', ({ request }) => {
        const cursor = new URL(request.url).searchParams.get('cursor');
        cursors.push(cursor);
        return HttpResponse.json(
          cursor === 'entry-2'
            ? { items: [entry('entry-1')], nextCursor: null }
            : {
                items: [entry('entry-3'), entry('entry-2')],
                nextCursor: 'entry-2',
              },
        );
      }),
    );
    useTokenStore.getState().setAccessToken('token-1');
    const { result } = renderHook(() => useLedger(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toHaveLength(2));

    await act(() => result.current.fetchNextPage());

    await waitFor(() => expect(result.current.hasNextPage).toBe(false));
    expect(result.current.data?.map((e) => e.id)).toEqual([
      'entry-3',
      'entry-2',
      'entry-1',
    ]);
    expect(cursors).toEqual([null, 'entry-2']);
  });
});
