import { AxiosError, AxiosHeaders } from 'axios';

export function axiosError(status?: number, data?: unknown) {
  const config = { headers: new AxiosHeaders() };
  const response =
    status === undefined
      ? undefined
      : { status, statusText: '', headers: {}, config, data };
  return new AxiosError('request failed', undefined, config, {}, response);
}
