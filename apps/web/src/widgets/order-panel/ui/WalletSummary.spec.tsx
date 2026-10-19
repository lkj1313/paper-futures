import { screen } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { useTokenStore } from '@/shared/api/token-store';
import { renderWithProviders } from '@/test/render';
import { server } from '@/test/server';
import { WalletSummary } from './WalletSummary';

describe('WalletSummary', () => {
  it('로그인 전에는 충전 버튼이 없다', () => {
    renderWithProviders(<WalletSummary />);

    expect(
      screen.queryByRole('button', { name: '충전' }),
    ).not.toBeInTheDocument();
  });

  it('로그인하면 지갑과 충전 버튼을 보여 준다', async () => {
    server.use(
      http.get('/api/wallet', () =>
        HttpResponse.json({
          asset: 'USDT',
          balance: '10000',
          usedMargin: '0',
          openOrderMargin: '0',
          availableBalance: '10000',
        }),
      ),
    );
    useTokenStore.getState().setAccessToken('token-1');

    renderWithProviders(<WalletSummary />);

    expect(await screen.findAllByText('10,000.00 USDT')).toHaveLength(2);
    expect(screen.getByRole('button', { name: '충전' })).toBeInTheDocument();
  });
});
