import { apiClient } from './api-client';

export type TreatmentType = 'orthodontic' | 'root_canal' | 'other';
export type TreatmentPlanStatus = 'active' | 'completed' | 'cancelled';
export type TreatmentSessionStatus = 'scheduled' | 'completed' | 'missed';

export const TREATMENT_TYPE_LABEL: Record<TreatmentType, string> = {
  orthodontic: 'Behel / Ortodontik',
  root_canal: 'PSA (Perawatan Saluran Akar)',
  other: 'Lainnya',
};

export const TREATMENT_PLAN_STATUS_LABEL: Record<TreatmentPlanStatus, string> = {
  active: 'Berjalan',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

export interface TreatmentPlan {
  id: number;
  patientId: number;
  treatmentType: TreatmentType;
  label?: string;
  totalStages?: number;
  currentStage: number;
  status: TreatmentPlanStatus;
  startDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TreatmentPlanSession {
  id: number;
  treatmentPlanId: number;
  stageNumber: number;
  encounterId?: number;
  date: string;
  notes?: string;
  status: TreatmentSessionStatus;
}

export interface CreateTreatmentPlanPayload {
  patientId: number;
  treatmentType: TreatmentType;
  label?: string;
  totalStages?: number;
  startDate?: string;
}

export interface UpdateTreatmentPlanPayload {
  label?: string;
  totalStages?: number;
  status?: TreatmentPlanStatus;
  startDate?: string;
}

export interface CreateTreatmentPlanSessionPayload {
  date: string;
  encounterId?: number;
  notes?: string;
  status?: TreatmentSessionStatus;
}

export const treatmentPlanApi = {
  listByPatient: (patientId: number) =>
    apiClient.get<TreatmentPlan[]>(`/patients/${patientId}/treatment-plans`),

  get: (id: number) => apiClient.get<TreatmentPlan>(`/treatment-plans/${id}`),

  create: (payload: CreateTreatmentPlanPayload) =>
    apiClient.post<TreatmentPlan>('/treatment-plans', payload),

  update: (id: number, payload: UpdateTreatmentPlanPayload) =>
    apiClient.patch<TreatmentPlan>(`/treatment-plans/${id}`, payload),

  listSessions: (id: number) =>
    apiClient.get<TreatmentPlanSession[]>(`/treatment-plans/${id}/sessions`),

  addSession: (id: number, payload: CreateTreatmentPlanSessionPayload) =>
    apiClient.post<TreatmentPlanSession>(`/treatment-plans/${id}/sessions`, payload),
};
