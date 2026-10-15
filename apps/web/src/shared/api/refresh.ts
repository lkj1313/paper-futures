import type { LoginResponse } from '@paper-futures/shared';
import axios, { isAxiosError } from 'axios';
import { notifySessionExpired } from './session-expired';
import { useTokenStore } from './token-store';

export const REFRESH_LOCK_NAME = 'paper-futures:auth-refresh';

const refreshClient = axios.create({ baseURL: '/api' });

let inFlight: Promise<string> | null = null;

export function refreshAccessToken(): Promise<string> {
  inFlight ??= withRefreshLock(requestNewToken).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

function withRefreshLock(task: () => Promise<string>): Promise<string> {
  if (!navigator.locks) return task();
  return navigator.locks.request(REFRESH_LOCK_NAME, task);
}

async function requestNewToken(): Promise<string> {
  try {
    const { data } = await refreshClient.post<LoginResponse>('/auth/refresh');
    useTokenStore.getState().setAccessToken(data.accessToken);
    return data.accessToken;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 401) {
      useTokenStore.getState().clearAccessToken();
      notifySessionExpired();
    }
    throw error;
  }
}
