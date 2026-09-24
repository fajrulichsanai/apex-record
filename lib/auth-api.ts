import { apiClient } from './api-client';
import type { User } from '@/types/user';

/** The impersonation token itself is kept by the /api/backend proxy in an
 * httpOnly cookie and never returned to page code. */
export interface ImpersonateResponse {
  user: User;
}

export const authApi = {
  /** Super Admin only — switches this browser's session to act as another user for 1h. */
  impersonate: (userId: number) => apiClient.post<ImpersonateResponse>(`/auth/impersonate/${userId}`),
};
