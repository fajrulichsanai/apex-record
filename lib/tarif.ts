import { apiClient } from './api-client';

export interface Tarif {
  id: number;
  clinicId: number;
  name: string;
  kategori: string;
  kodeIcd9?: string;
  deskripsi?: string;
  hargaPokok: number;
  hargaJual: number;
  diskonMaksimal: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTarifPayload {
  name: string;
  kategori: string;
  kodeIcd9?: string;
  deskripsi?: string;
  hargaPokok?: number;
  hargaJual: number;
  diskonMaksimal?: number;
}

export interface UpdateTarifPayload {
  name?: string;
  kategori?: string;
  kodeIcd9?: string;
  deskripsi?: string;
  hargaPokok?: number;
  hargaJual?: number;
  diskonMaksimal?: number;
  isActive?: boolean;
}

export interface TarifListResponse {
  data: Tarif[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

export const tarifApi = {
  list: (query?: { search?: string; kategori?: string; page?: number; limit?: number }) =>
    apiClient.get<TarifListResponse>('/settings/tarifs' + (query ? '?' + new URLSearchParams(query as any).toString() : '')),

  get: (id: number) =>
    apiClient.get<Tarif>(`/settings/tarifs/${id}`),

  create: (payload: CreateTarifPayload) =>
    apiClient.post<Tarif>('/settings/tarifs', payload),

  update: (id: number, payload: UpdateTarifPayload) =>
    apiClient.put<Tarif>(`/settings/tarifs/${id}`, payload),

  delete: (id: number) =>
    apiClient.delete<{ success: boolean }>(`/settings/tarifs/${id}`),
};
