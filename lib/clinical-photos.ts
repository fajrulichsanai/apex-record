import { apiClient } from './api-client';

export interface PhotoTemplate {
  id: number;
  groupId: number;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

export interface PhotoTemplateGroup {
  id: number;
  clinicId: number | null;
  name: string;
  sortOrder: number;
  isActive: boolean;
  templates: PhotoTemplate[];
}

export interface PatientPhoto {
  id: number;
  patientId: number;
  encounterId: number;
  templateId: number | null;
  fileUrl: string;
  originalName?: string | null;
  takenAt: string;
  takenBy?: number | null;
  originalSizeBytes?: number | null;
  compressedSizeBytes?: number | null;
  template?: PhotoTemplate | null;
}

export interface PatientPhotoFolder {
  group: PhotoTemplateGroup | null;
  photos: PatientPhoto[];
}

export interface PatientPhotoGallery {
  consentMarketing: boolean | null;
  folders: PatientPhotoFolder[];
}

export const photoTemplateGroupsApi = {
  list: (activeOnly = true) =>
    apiClient.get<PhotoTemplateGroup[]>(`/photo-template-groups?activeOnly=${activeOnly}`),

  create: (name: string) => apiClient.post<PhotoTemplateGroup>('/photo-template-groups', { name }),

  update: (
    groupId: number,
    payload: { name?: string; sortOrder?: number; isActive?: boolean },
  ) => apiClient.patch<PhotoTemplateGroup>(`/photo-template-groups/${groupId}`, payload),

  createTemplate: (groupId: number, name: string, sortOrder?: number) =>
    apiClient.post<PhotoTemplate>(`/photo-template-groups/${groupId}/templates`, {
      name,
      sortOrder,
    }),

  updateTemplate: (
    templateId: number,
    payload: { name?: string; sortOrder?: number; isActive?: boolean },
  ) => apiClient.patch<PhotoTemplate>(`/photo-template-groups/templates/${templateId}`, payload),
};

export const clinicalPhotosApi = {
  listByEncounter: (encounterId: number) =>
    apiClient.get<PatientPhoto[]>(`/encounters/${encounterId}/photos`),

  upload: (
    encounterId: number,
    file: File,
    templateId?: number,
    originalSizeBytes?: number,
  ) => {
    const form = new FormData();
    form.append('photo', file);
    if (templateId) form.append('templateId', String(templateId));
    if (originalSizeBytes) form.append('originalSizeBytes', String(originalSizeBytes));
    return apiClient.postForm<PatientPhoto>(`/encounters/${encounterId}/photos`, form);
  },

  remove: (encounterId: number, photoId: number) =>
    apiClient.delete<void>(`/encounters/${encounterId}/photos/${photoId}`),

  galleryForPatient: (patientId: number) =>
    apiClient.get<PatientPhotoGallery>(`/patients/${patientId}/photos`),

  setConsent: (patientId: number, consent: boolean | null) =>
    apiClient.patch<{ photoConsentMarketing: boolean | null }>(
      `/patients/${patientId}/photo-consent`,
      { consent },
    ),
};
