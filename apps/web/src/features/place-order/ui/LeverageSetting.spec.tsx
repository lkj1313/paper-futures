import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { useTokenStore } from '@/shared/api/token-store';
import { renderWithProviders } from '@/test/render';
import { server } from '@/test/server';
import { LeverageSetting } from './LeverageSetting';

function loggedInWith(saved: number) {
  server.use(
    http.get('/api/leverage', () =>
      HttpResponse.json({ BTCUSDT: saved, ETHUSDT: 10 }),
    ),
    http.get('/api/positions', () => HttpResponse.json([])),
  );
  useTokenStore.getState().setAccessToken('token-1');
}

const openAndRaise = async () => {
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: '20x' }));
  await user.click(
    await screen.findByRole('button', { name: '레버리지 높이기' }),
  );
  await user.click(screen.getByRole('button', { name: '확인' }));
};

describe('LeverageSetting', () => {
  it('서버에 저장된 레버리지를 버튼에 보여 준다', async () => {
    loggedInWith(20);

    renderWithProviders(<LeverageSetting symbol="BTCUSDT" />);

    expect(
      await screen.findByRole('button', { name: '20x' }),
    ).toBeInTheDocument();
  });

  it('확인하면 서버에 저장하고, 버튼과 안내가 새 값으로 바뀐다', async () => {
    loggedInWith(20);
    let sent: unknown;
    server.use(
      http.put('/api/leverage/BTCUSDT', async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json({ symbol: 'BTCUSDT', leverage: 21 });
      }),
    );
    renderWithProviders(<LeverageSetting symbol="BTCUSDT" />);

    await openAndRaise();

    expect(sent).toEqual({ leverage: 21 });
    expect(
      await screen.findByRole('button', { name: '21x' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText('BTCUSDT 레버리지를 21배로 바꿨습니다'),
    ).toBeInTheDocument();
  });

  it('서버가 거부하면 그 이유를 에러로 알려 준다', async () => {
    loggedInWith(20);
    server.use(
      http.put('/api/leverage/BTCUSDT', () =>
        HttpResponse.json(
          {
            statusCode: 409,
            code: 'LEVERAGE_LOCKED',
            message: '포지션이 열려 있어 레버리지를 바꿀 수 없습니다.',
          },
          { status: 409 },
        ),
      ),
    );
    renderWithProviders(<LeverageSetting symbol="BTCUSDT" />);

    await openAndRaise();

    expect(
      await screen.findByText(
        '포지션이 열려 있어 레버리지를 바꿀 수 없습니다.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '20x' })).toBeInTheDocument();
    expect(screen.getByText('레버리지 조정')).toBeInTheDocument();
  });

  it('로그인 전에는 기본 10배를 보여 주고 저장 대신 안내한다', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LeverageSetting symbol="BTCUSDT" />);

    await user.click(screen.getByRole('button', { name: '10x' }));

    expect(
      await screen.findByText('로그인하면 바꿀 수 있습니다'),
    ).toBeInTheDocument();
  });
});
