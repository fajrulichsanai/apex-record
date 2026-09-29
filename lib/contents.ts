import { ApiError, apiClient, apiFileUrl } from './api-client';
import { isDemoMode } from './demo/demo-mode';

export type ContentStatus = 'draft' | 'published';
export type ContentLayout = 'stack' | 'split';
export type ContentBackground = 'light' | 'navy';

/** Position of one photo inside its frame on the story. */
export interface ContentPhotoFrame {
  zoom: number;
  ox: number;
  oy: number;
}

export interface ContentSettings {
  before?: ContentPhotoFrame;
  after?: ContentPhotoFrame;
  brandName?: string;
  brandSub?: string;
  badge?: string;
  contactTitle?: string;
  contactLine?: string;
  handle?: string;
}

export interface ClinicContent {
  id: number;
  title: string;
  caption: string | null;
  layout: ContentLayout;
  background: ContentBackground;
  showDisclaimer: boolean;
  beforeImageUrl: string | null;
  afterImageUrl: string | null;
  settings: ContentSettings | null;
  imageUrl: string | null;
  status: ContentStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContentPayload {
  title: string;
  caption?: string;
  layout: ContentLayout;
  background: ContentBackground;
  showDisclaimer: boolean;
  beforeImageUrl?: string | null;
  afterImageUrl?: string | null;
  settings: ContentSettings;
}

export const CONTENT_STATUS_LABEL: Record<ContentStatus, string> = {
  draft: 'Draft',
  published: 'Terbit',
};

/**
 * Fetches an image the API serves for the editor (same origin, so the canvas
 * it's drawn on can still be exported). Returns null when there is none.
 */
async function fetchImage(path: string): Promise<Blob | null> {
  if (isDemoMode()) return null;
  const res = await fetch(apiFileUrl(path), { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new ApiError('Gagal memuat gambar', res.status);
  return res.blob();
}

export const contentsApi = {
  list: () => apiClient.get<ClinicContent[]>('/contents'),
  get: (id: number) => apiClient.get<ClinicContent>(`/contents/${id}`),
  create: (payload: ContentPayload) => apiClient.post<ClinicContent>('/contents', payload),
  update: (id: number, payload: Partial<ContentPayload>) => apiClient.patch<ClinicContent>(`/contents/${id}`, payload),
  uploadImage: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiClient.postForm<{ url: string }>('/contents/images', form);
  },
  publish: (id: number, image: Blob) => {
    const form = new FormData();
    form.append('file', image, `story-${id}.png`);
    return apiClient.postForm<ClinicContent>(`/contents/${id}/publish`, form);
  },
  unpublish: (id: number) => apiClient.post<ClinicContent>(`/contents/${id}/unpublish`),
  remove: (id: number) => apiClient.delete<void>(`/contents/${id}`),
  photo: (id: number, which: 'before' | 'after' | 'rendered') => fetchImage(`/contents/${id}/photos/${which}`),
  logo: () => fetchImage('/contents/logo'),
};
