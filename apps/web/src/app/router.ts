import { isMarketSymbol } from '@paper-futures/shared';
import { createBrowserRouter, redirect } from 'react-router';
import { LoginPage } from '@/pages/login';
import { NotFoundPage } from '@/pages/not-found';
import { SignupPage } from '@/pages/signup';
import { TradePage } from '@/pages/trade';

const DEFAULT_TRADE_PATH = '/trade/BTCUSDT';

export const router = createBrowserRouter([
  { path: '/', loader: () => redirect(DEFAULT_TRADE_PATH) },
  {
    path: '/trade/:symbol',
    loader: ({ params }) =>
      isMarketSymbol(params.symbol) ? null : redirect(DEFAULT_TRADE_PATH),
    Component: TradePage,
  },
  { path: '/login', Component: LoginPage },
  { path: '/signup', Component: SignupPage },
  { path: '*', Component: NotFoundPage },
]);
