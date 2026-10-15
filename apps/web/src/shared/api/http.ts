import type { ErrorResponse } from '@paper-futures/shared';
import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
  isAxiosError,
} from 'axios';
import { refreshAccessToken } from './refresh';
import { useTokenStore } from './token-store';

declare module 'axios' {
  interface InternalAxiosRequestConfig {
    retriedAfterRefresh?: boolean;
  }
}

export const http = axios.create({ baseURL: '/api' });

http.interceptors.request.use((config) => {
  const { accessToken } = useTokenStore.getState();
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

http.interceptors.response.use(undefined, async (error: unknown) => {
  if (!isTokenExpired(error) || error.config.retriedAfterRefresh) throw error;

  const { accessToken } = useTokenStore.getState();
  if (accessToken === null) throw error;
  if (error.config.headers.Authorization === `Bearer ${accessToken}`) {
    await refreshAccessToken();
  }
  error.config.retriedAfterRefresh = true;
  return http(error.config);
});

function isTokenExpired(
  error: unknown,
): error is AxiosError<ErrorResponse> & { config: InternalAxiosRequestConfig } {
  return (
    isAxiosError<ErrorResponse>(error) &&
    error.config !== undefined &&
    error.response?.status === 401 &&
    error.response.data?.code === 'TOKEN_EXPIRED'
  );
}
