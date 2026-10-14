import { isMarketSymbol } from '@paper-futures/shared';
import { createBrowserRouter, redirect } from 'react-router';
import { LoginPage } from '@/pages/login';
import { NotFoundPage } from '@/pages/not-found';
import { SignupPage } from '@/pages/signup';
import { TradePage } from '@/pages/trade';
import { useTokenStore } from '@/shared/api/token-store';
import { DEFAULT_TRADE_PATH } from '@/shared/config/routes';

const redirectIfLoggedIn = () =>
  useTokenStore.getState().accessToken ? redirect(DEFAULT_TRADE_PATH) : null;

export const router = createBrowserRouter([
  { path: '/', loader: () => redirect(DEFAULT_TRADE_PATH) },
  {
    path: '/trade/:symbol',
    loader: ({ params }) =>
      isMarketSymbol(params.symbol) ? null : redirect(DEFAULT_TRADE_PATH),
    Component: TradePage,
  },
  { path: '/login', loader: redirectIfLoggedIn, Component: LoginPage },
  { path: '/signup', loader: redirectIfLoggedIn, Component: SignupPage },
  { path: '*', Component: NotFoundPage },
]);
