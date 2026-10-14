import type {
  LoginRequest,
  LoginResponse,
  SignupRequest,
  UserProfile,
} from '@paper-futures/shared';
import { http } from '@/shared/api/http';

export const login = (body: LoginRequest) =>
  http.post<LoginResponse>('/auth/login', body).then((res) => res.data);

export const signup = (body: SignupRequest) =>
  http.post<UserProfile>('/auth/signup', body).then((res) => res.data);
