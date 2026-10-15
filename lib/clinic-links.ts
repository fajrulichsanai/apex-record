import { apiClient } from './api-client';

export type LinkStatus = 'pending' | 'approved' | 'rejected' | 'expired';

/** A multiklinik link request as the clinic's own owner sees it (Persetujuan). */
export interface ClinicLinkRequest {
  id: number;
  status: LinkStatus;
  ownerName: string | null;
  ownerEmail: string | null;
  requestedAt: string | null;
  respondedAt: string | null;
  expiresAt: string | null;
}

export const clinicLinksApi = {
  list: () => apiClient.get<ClinicLinkRequest[]>('/clinic-links/requests'),
  respond: (id: number, approve: boolean) =>
    apiClient.post<{ id: number; status: LinkStatus; respondedAt: string }>(
      `/clinic-links/requests/${id}/respond`,
      { approve },
    ),
};

/** Fired after an answer so the sidebar badge refreshes without a reload. */
export const CLINIC_LINKS_CHANGED = 'clinic-links-changed';
