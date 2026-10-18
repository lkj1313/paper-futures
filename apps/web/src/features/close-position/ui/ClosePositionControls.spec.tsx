import type { AccountOrder } from '@paper-futures/shared';
import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, HttpResponse, http, type JsonBodyType } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { Toaster } from '@/shared/ui/sonner';
import { createTestQueryClient } from '@/test/render';
import { server } from '@/test/server';
import {
  ClosePositionControls,
  type ClosePositionControlsProps,
} from './ClosePositionControls';

const LONG: ClosePositionControlsProps = {
  symbol: 'BTCUSDT',
  side: 'LONG',
  qty: '0.01',
  markPrice: '81500.04',
};

const order = (fields: Partial<AccountOrder>): AccountOrder => ({
  id: 'order-1',
  symbol: 'BTCUSDT',
  side: 'SELL',
  type: 'MARKET',
  status: 'FILLED',
  qty: '0.01',
  price: null,
  leverage: 10,
  reduceOnly: true,
  reservedMargin: '0',
  avgFillPrice: '81500',
  fee: '0.4075',
  realizedPnl: '5',
  createdAt: '2026-10-18T00:00:00.000Z',
  updatedAt: '2026-10-18T00:00:00.000Z',
  ...fields,
});

function capturePost(response: JsonBodyType, status = 201) {
  const sent: unknown[] = [];
  server.use(
    http.post('/api/orders', async ({ request }) => {
      sent.push(await request.json());
      return HttpResponse.json(response, { status });
    }),
  );
  return sent;
}

function renderControls(props: ClosePositionControlsProps = LONG) {
  const client = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      {children}
      <Toaster theme="dark" />
    </QueryClientProvider>
  );
  const view = render(<ClosePositionControls {...props} />, { wrapper });
  return { user: userEvent.setup(), ...view };
}

const priceInput = () => screen.getByLabelText('닫기 가격');
const qtyInput = () => screen.getByLabelText('닫기 수량');
const marketButton = () =>
  screen.getByRole('button', { name: '시장가로 닫기' });
const limitButton = () => screen.getByRole('button', { name: '지정가로 닫기' });

describe('ClosePositionControls', () => {
  it('가격은 마크가격을 호가 단위로, 수량은 포지션 전체로 채운다', () => {
    renderControls();

    expect(priceInput()).toHaveValue('81500.0');
    expect(qtyInput()).toHaveValue('0.01');
  });

  it('시장가로 닫으면 반대 방향 reduceOnly 시장가를 보내고 정리 결과를 알린다', async () => {
    const sent = capturePost({ order: order({}), position: null });
    const { user } = renderControls();

    await user.click(marketButton());

    expect(
      await screen.findByText('BTCUSDT 0.010 포지션 정리 (평균 81,500.0)'),
    ).toBeInTheDocument();
    expect(sent).toEqual([
      {
        symbol: 'BTCUSDT',
        side: 'SELL',
        type: 'MARKET',
        qty: '0.01',
        reduceOnly: true,
      },
    ]);
  });

  it('지정가로 닫으면 고친 가격·수량으로 걸고, 대기 주문을 넣었다고 알린다', async () => {
    const sent = capturePost({
      order: order({
        type: 'LIMIT',
        status: 'NEW',
        qty: '0.005',
        price: '82000',
        avgFillPrice: null,
      }),
      position: null,
    });
    const { user } = renderControls();

    fireEvent.change(priceInput(), { target: { value: '82000' } });
    fireEvent.change(qtyInput(), { target: { value: '0.005' } });
    await user.click(limitButton());

    expect(
      await screen.findByText('지정가 닫기 주문을 넣었습니다 (82,000.0)'),
    ).toBeInTheDocument();
    expect(sent).toEqual([
      {
        symbol: 'BTCUSDT',
        side: 'SELL',
        type: 'LIMIT',
        qty: '0.005',
        price: '82000',
        reduceOnly: true,
      },
    ]);
  });

  it('마크가격이 늦게 오면 그때 한 번 채우고, 지운 뒤에는 다시 채우지 않는다', () => {
    const { rerender } = renderControls({ ...LONG, markPrice: undefined });
    expect(priceInput()).toHaveValue('');

    rerender(<ClosePositionControls {...LONG} markPrice="81500.04" />);
    expect(priceInput()).toHaveValue('81500.0');

    fireEvent.change(priceInput(), { target: { value: '' } });
    rerender(<ClosePositionControls {...LONG} markPrice="81600.00" />);
    expect(priceInput()).toHaveValue('');
  });

  it('포지션 수량이 바뀌면 수량 칸을 새 전체 수량으로 바꾼다', () => {
    const { rerender } = renderControls();
    fireEvent.change(qtyInput(), { target: { value: '0.003' } });

    rerender(<ClosePositionControls {...LONG} qty="0.015" />);

    expect(qtyInput()).toHaveValue('0.015');
  });

  it('수량이 비면 두 버튼을, 가격이 비면 지정가 버튼을 막는다', () => {
    renderControls();

    fireEvent.change(priceInput(), { target: { value: '' } });
    expect(marketButton()).toBeEnabled();
    expect(limitButton()).toBeDisabled();

    fireEvent.change(qtyInput(), { target: { value: '' } });
    expect(marketButton()).toBeDisabled();
  });

  it('닫기를 보내는 동안에는 두 버튼을 막는다', async () => {
    server.use(
      http.post('/api/orders', async () => {
        await delay('infinite');
        return HttpResponse.json({});
      }),
    );
    const { user } = renderControls();

    await user.click(marketButton());

    expect(marketButton()).toBeDisabled();
    expect(limitButton()).toBeDisabled();
  });

  it('서버가 거부하면 그 이유를 알린다', async () => {
    capturePost(
      {
        statusCode: 400,
        code: 'REDUCE_ONLY_REJECTED',
        message: '줄일 수 있는 포지션이 없어 reduceOnly 주문을 거부했습니다.',
      },
      400,
    );
    const { user } = renderControls();

    await user.click(marketButton());

    expect(
      await screen.findByText(
        '줄일 수 있는 포지션이 없어 reduceOnly 주문을 거부했습니다.',
      ),
    ).toBeInTheDocument();
  });
});
