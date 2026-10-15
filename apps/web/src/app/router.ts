import { isMarketSymbol } from '@paper-futures/shared';
import { createBrowserRouter, redirect } from 'react-router';
import { toast } from 'sonner';
import { LoginPage } from '@/pages/login';
import { NotFoundPage } from '@/pages/not-found';
import { SignupPage } from '@/pages/signup';
import { TradePage } from '@/pages/trade';
import { queryClient } from '@/shared/api/query-client';
import { restoreSession } from '@/shared/api/restore-session';
import { setSessionExpiredHandler } from '@/shared/api/session-expired';
import { useTokenStore } from '@/shared/api/token-store';
import { DEFAULT_TRADE_PATH } from '@/shared/config/routes';

const redirectIfLoggedIn = async () => {
  await restoreSession();
  return useTokenStore.getState().accessToken
    ? redirect(DEFAULT_TRADE_PATH)
    : null;
};

export const router = createBrowserRouter([
  {
    loader: async () => {
      await restoreSession();
      return null;
    },
    HydrateFallback: () => null,
    children: [
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
    ],
  },
]);

setSessionExpiredHandler(() => {
  queryClient.clear();
  toast.info('로그인이 만료되었습니다. 다시 로그인해 주세요.');
  void router.navigate('/login');
});
