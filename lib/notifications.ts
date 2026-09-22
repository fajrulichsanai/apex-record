import { apiClient } from './api-client';

export type NotificationType = 'PATIENT_NEW' | 'KUNJUNGAN_NEW' | 'PAYMENT_NEW' | 'USER_JOINED';

export interface AppNotification {
  id: number;
  clinicId: number;
  type: NotificationType;
  title: string;
  message: string | null;
  entityType: string | null;
  entityId: string | null;
  actorId: number | null;
  actorName: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationListResponse {
  items: AppNotification[];
  unreadCount: number;
}

export const notificationApi = {
  list: (opts?: { unreadOnly?: boolean; limit?: number }) => {
    const params = new URLSearchParams();
    if (opts?.unreadOnly) params.set('unreadOnly', 'true');
    if (opts?.limit) params.set('limit', String(opts.limit));
    const qs = params.toString();
    return apiClient.get<NotificationListResponse>(`/notifications${qs ? `?${qs}` : ''}`);
  },

  markRead: (id: number) => apiClient.post<{ success: boolean }>(`/notifications/${id}/read`, {}),

  markAllRead: () => apiClient.post<{ success: boolean }>('/notifications/read-all', {}),
};
