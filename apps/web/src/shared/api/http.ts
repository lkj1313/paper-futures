import axios from 'axios';
import { useTokenStore } from './token-store';

export const http = axios.create({ baseURL: '/api' });

http.interceptors.request.use((config) => {
  const { accessToken } = useTokenStore.getState();
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});
