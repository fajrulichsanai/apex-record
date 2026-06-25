import { apiClient } from './api-client';

export interface ClinicDayHours {
  id: string;
  label: string;
  active: boolean;
  buka: string;
  bukaM: string;
  tutup: string;
  tutupM: string;
}

export interface ClinicResponse {
  id: number;
  name: string;
  address: string;
  city: string;
  province: string;
  postalCode?: string;
  phone: string;
  email?: string;
  website?: string;
  sipNumber?: string;
  operationalHours?: Record<string, string>;
  setupComplete: boolean;
}

export interface UpdateClinicPayload {
  name: string;
  address: string;
  city: string;
  province: string;
  postalCode?: string;
  phone: string;
  email?: string;
  website?: string;
  sipNumber?: string;
  operationalHours?: Record<string, string>;
}

export const DAY_KEYS: { id: string; label: string; key: string }[] = [
  { id: 'sen', label: 'Sen', key: 'senin' },
  { id: 'sel', label: 'Sel', key: 'selasa' },
  { id: 'rab', label: 'Rab', key: 'rabu' },
  { id: 'kam', label: 'Kam', key: 'kamis' },
  { id: 'jum', label: 'Jum', key: 'jumat' },
  { id: 'sab', label: 'Sab', key: 'sabtu' },
  { id: 'min', label: 'Min', key: 'minggu' },
];

export function operationalHoursToDays(hours?: Record<string, string>): ClinicDayHours[] {
  return DAY_KEYS.map(({ id, label, key }) => {
    const value = hours?.[key];
    if (!value || value.toLowerCase() === 'tutup') {
      return { id, label, active: false, buka: '', bukaM: '00', tutup: '', tutupM: '00' };
    }
    const [start, end] = value.split('-');
    const [buka, bukaM] = (start || '').split(':');
    const [tutup, tutupM] = (end || '').split(':');
    return {
      id,
      label,
      active: true,
      buka: buka || '',
      bukaM: bukaM || '00',
      tutup: tutup || '',
      tutupM: tutupM || '00',
    };
  });
}

export function daysToOperationalHours(days: ClinicDayHours[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const day of days) {
    const dayKey = DAY_KEYS.find((d) => d.id === day.id)?.key;
    if (!dayKey) continue;
    if (!day.active || !day.buka || !day.tutup) {
      result[dayKey] = 'Tutup';
    } else {
      result[dayKey] = `${day.buka}:${day.bukaM || '00'}-${day.tutup}:${day.tutupM || '00'}`;
    }
  }
  return result;
}

export const clinicApi = {
  get: () => apiClient.get<ClinicResponse>('/settings/clinic'),
  update: (payload: UpdateClinicPayload) => apiClient.put<ClinicResponse>('/settings/clinic', payload),
};
