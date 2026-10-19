import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { server } from '@/test/server';
import { DepositButton } from './DepositButton';

const deposit = async (amount: string) => {
  await userEvent.click(screen.getByRole('button', { name: '충전' }));
  fireEvent.change(await screen.findByLabelText('충전 금액'), {
    target: { value: amount },
  });
  await userEvent.click(screen.getByRole('button', { name: '확인' }));
};

describe('DepositButton', () => {
  it('충전을 보내고, 충전했다고 알린다', async () => {
    const sent: unknown[] = [];
    server.use(
      http.post('/api/wallet/deposit', async ({ request }) => {
        sent.push(await request.json());
        return HttpResponse.json({
          asset: 'USDT',
          balance: '20000',
          usedMargin: '0',
          openOrderMargin: '0',
          availableBalance: '20000',
        });
      }),
    );
    renderWithProviders(<DepositButton />);

    await deposit('10000');

    expect(
      await screen.findByText('10,000.00 USDT를 충전했습니다'),
    ).toBeInTheDocument();
    expect(sent).toEqual([{ amount: '10000' }]);
  });

  it('서버가 거부하면 그 이유를 알린다', async () => {
    server.use(
      http.post('/api/wallet/deposit', () =>
        HttpResponse.json(
          {
            statusCode: 400,
            code: 'INVALID_DEPOSIT_AMOUNT',
            message: '충전 금액이 올바르지 않습니다.',
          },
          { status: 400 },
        ),
      ),
    );
    renderWithProviders(<DepositButton />);

    await deposit('500');

    expect(
      await screen.findByText('충전 금액이 올바르지 않습니다.'),
    ).toBeInTheDocument();
  });
});
