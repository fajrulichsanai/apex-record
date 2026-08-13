import { apiClient } from './api-client';
import type { User } from '@/types/user';

export interface ImpersonateResponse {
  accessToken: string;
  user: User;
}

export const authApi = {
  /** Super Admin only — issues a short-lived token to act as another user. */
  impersonate: (userId: number) => apiClient.post<ImpersonateResponse>(`/auth/impersonate/${userId}`),
};
