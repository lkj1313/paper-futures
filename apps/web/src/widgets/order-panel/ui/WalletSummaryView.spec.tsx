import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WalletSummaryView } from './WalletSummaryView';

const valueOf = (label: string) => screen.getByText(label).nextElementSibling;

describe('WalletSummaryView', () => {
  it('잔고, 주문 가능 금액, 포지션 증거금, 대기 주문 증거금을 보여 준다', () => {
    render(
      <WalletSummaryView
        wallet={{
          asset: 'USDT',
          balance: '9995.849975',
          usedMargin: '81.565',
          openOrderMargin: '10.02',
          availableBalance: '9904.264975',
        }}
      />,
    );

    expect(valueOf('잔고')).toHaveTextContent('9,995.85 USDT');
    expect(valueOf('주문 가능')).toHaveTextContent('9,904.26 USDT');
    expect(valueOf('포지션 증거금')).toHaveTextContent('81.57 USDT');
    expect(valueOf('대기 주문 증거금')).toHaveTextContent('10.02 USDT');
  });

  it('지갑이 없으면 --로 보여 준다', () => {
    render(<WalletSummaryView wallet={undefined} />);

    expect(valueOf('잔고')).toHaveTextContent('-- USDT');
    expect(valueOf('주문 가능')).toHaveTextContent('-- USDT');
  });

  it('지갑 제목 옆에 넘겨받은 버튼을 보여 준다', () => {
    render(
      <WalletSummaryView
        wallet={undefined}
        action={<button type="button">충전</button>}
      />,
    );

    expect(screen.getByRole('button', { name: '충전' })).toBeInTheDocument();
  });
});
