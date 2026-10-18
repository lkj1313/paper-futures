import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { useTokenStore } from '@/shared/api/token-store';
import { renderWithProviders } from '@/test/render';
import { server } from '@/test/server';
import { LedgerTable } from './LedgerTable';

describe('LedgerTable', () => {
  it('최신 기록부터 보여 주고, 더 보기를 누르면 이전 기록을 아래에 붙인다', async () => {
    server.use(
      http.get('/api/wallet/ledger', ({ request }) =>
        HttpResponse.json(
          new URL(request.url).searchParams.get('cursor') === 'entry-2'
            ? {
                items: [
                  {
                    id: 'entry-1',
                    type: 'SIGNUP_BONUS',
                    amount: '10000',
                    balanceAfter: '10000',
                    createdAt: '2026-10-18T10:00:00.000Z',
                  },
                ],
                nextCursor: null,
              }
            : {
                items: [
                  {
                    id: 'entry-2',
                    type: 'TRADING_FEE',
                    amount: '-0.4078255',
                    balanceAfter: '9999.5921745',
                    createdAt: '2026-10-18T10:05:12.000Z',
                  },
                ],
                nextCursor: 'entry-2',
              },
        ),
      ),
    );
    useTokenStore.getState().setAccessToken('token-1');
    renderWithProviders(<LedgerTable />);

    await userEvent.click(
      await screen.findByRole('button', { name: '더 보기' }),
    );

    expect(await screen.findByText('가입 보너스')).toBeInTheDocument();
    expect(screen.getByText('거래 수수료')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '더 보기' }),
    ).not.toBeInTheDocument();
  });
});
