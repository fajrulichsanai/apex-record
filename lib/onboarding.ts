import { apiClient } from './api-client';

export interface OnboardingStatus {
  infoKlinik: { complete: boolean };
  tarif: { complete: boolean; count: number };
  dokter: { complete: boolean; count: number };
  allComplete: boolean;
}

export const onboardingApi = {
  getStatus: () => apiClient.get<OnboardingStatus>('/onboarding/status'),
};
