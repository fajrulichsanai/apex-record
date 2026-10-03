import { apiClient } from './api-client';

export type SupportingExamImageType = 'photo' | 'xray';
export type SupportingExamImageCategory =
  | 'intraoral'
  | 'extraoral'
  | 'occlusal'
  | 'before'
  | 'progress'
  | 'after';

export interface SupportingExamImage {
  id: number;
  encounterId?: number;
  imageType: SupportingExamImageType;
  category?: SupportingExamImageCategory | null;
  fileUrl: string;
  originalName?: string;
  notes?: string;
  createdAt?: string;
}

export const supportingExamApi = {
  list: (encounterId: number) =>
    apiClient.get<SupportingExamImage[]>(`/encounters/${encounterId}/supporting-exam-images`),

  upload: (
    encounterId: number,
    file: File,
    imageType: SupportingExamImageType,
    notes?: string,
    category?: SupportingExamImageCategory,
  ) => {
    const form = new FormData();
    form.append('image', file);
    form.append('imageType', imageType);
    if (category) form.append('category', category);
    if (notes) form.append('notes', notes);
    return apiClient.postForm<SupportingExamImage>(
      `/encounters/${encounterId}/supporting-exam-images`,
      form,
    );
  },

  remove: (encounterId: number, imageId: number) =>
    apiClient.delete<void>(`/encounters/${encounterId}/supporting-exam-images/${imageId}`),
};
