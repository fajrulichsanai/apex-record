import { apiClient } from './api-client';

export interface MfaStatus {
  enabled: boolean;
}

export interface MfaSetupResult {
  secret: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
}

export interface MfaEnableResult {
  backupCodes: string[];
}

export const mfaApi = {
  getStatus: () => apiClient.get<MfaStatus>('/auth/mfa/status'),
  setup: () => apiClient.post<MfaSetupResult>('/auth/mfa/setup'),
  enable: (code: string) =>
    apiClient.post<MfaEnableResult>('/auth/mfa/enable', { code }),
  disable: (password: string) =>
    apiClient.post<{ success: boolean }>('/auth/mfa/disable', { password }),
};
