'use client';

import { useEffect, useState } from 'react';
import SuperAdminLayout from '@/components/layout/SuperAdminLayout';
import CustomSelect from '@/components/form/CustomSelect';
import { multiClinicApi, type MultiClinicOwner } from '@/lib/multi-clinic';
import { apiClient, ApiError } from '@/lib/api-client';
import type { Clinic } from '@/types/clinic';
import '../../styles/super-admin.css';

export default function MultiClinicOwnersPage() {
  const [owners, setOwners] = useState<MultiClinicOwner[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClinicId, setSelectedClinicId] = useState<Record<number, string>>({});
  const [busyOwnerId, setBusyOwnerId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ownersData, clinicsData] = await Promise.all([
        multiClinicApi.listOwners(),
        apiClient.get<Clinic[]>('/clinics'),
      ]);
      setOwners(ownersData);
      setClinics(clinicsData);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleLink = async (ownerId: number) => {
    const clinicId = selectedClinicId[ownerId];
    if (!clinicId) return;
    setBusyOwnerId(ownerId);
    try {
      await multiClinicApi.linkClinic(ownerId, Number(clinicId));
      setSelectedClinicId((s) => ({ ...s, [ownerId]: '' }));
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal menghubungkan klinik');
    } finally {
      setBusyOwnerId(null);
    }
  };

  const handleUnlink = async (ownerId: number, clinicId: number) => {
    setBusyOwnerId(ownerId);
    try {
      await multiClinicApi.unlinkClinic(ownerId, clinicId);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal memutuskan klinik');
    } finally {
      setBusyOwnerId(null);
    }
  };

  return (
    <SuperAdminLayout>
      <div className="sa-page">
        <div className="page-header">
          <div className="page-title-block">
            <div className="page-title">
              <h1>Multi-Klinik Owner</h1>
            </div>
            <p className="page-subtitle">
              Hubungkan klinik ke akun Multi-Klinik Owner. Buat akunnya dulu di menu User Management dengan role &quot;Multi-Klinik Owner&quot;.
            </p>
          </div>
        </div>

        {error && <div className="alert-error">{error}</div>}

        {loading ? (
          <p>Memuat...</p>
        ) : owners.length === 0 ? (
          <div className="alert-error" style={{ background: '#F5F6FA', color: '#6B7A99', border: '1px solid #E8ECF4' }}>
            Belum ada akun dengan role Multi-Klinik Owner.
          </div>
        ) : (
          <div className="table-wrap">
            <table className="sa-table">
              <thead>
                <tr>
                  <th>Owner</th>
                  <th>Klinik yang Dimiliki</th>
                  <th>Hubungkan Klinik Baru</th>
                </tr>
              </thead>
              <tbody>
                {owners.map((owner) => {
                  const linkedIds = new Set(owner.clinics.map((c) => c.id));
                  const availableClinics = clinics.filter((c) => !linkedIds.has(c.id));
                  return (
                    <tr key={owner.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{owner.name}</div>
                        <div style={{ fontSize: 12.5, color: 'var(--text-sub)' }}>{owner.email}</div>
                      </td>
                      <td>
                        {owner.clinics.length === 0 ? (
                          <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Belum ada klinik</span>
                        ) : (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {owner.clinics.map((c) => (
                              <span
                                key={c.id}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  background: 'rgba(79,126,248,.1)',
                                  color: 'var(--primary)',
                                  borderRadius: 20,
                                  padding: '4px 10px',
                                  fontSize: 12.5,
                                  fontWeight: 600,
                                }}
                              >
                                {c.name}
                                <button
                                  type="button"
                                  onClick={() => handleUnlink(owner.id, c.id)}
                                  disabled={busyOwnerId === owner.id}
                                  style={{
                                    border: 'none',
                                    background: 'none',
                                    color: 'inherit',
                                    cursor: 'pointer',
                                    fontWeight: 700,
                                    padding: 0,
                                  }}
                                  aria-label={`Putuskan ${c.name}`}
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 8, minWidth: 220 }}>
                          <CustomSelect
                            value={selectedClinicId[owner.id] || ''}
                            onChange={(value) => setSelectedClinicId((s) => ({ ...s, [owner.id]: value }))}
                            options={availableClinics.map((c) => ({ value: c.id.toString(), label: c.name }))}
                            placeholder="Pilih klinik..."
                          />
                          <button
                            type="button"
                            className="btn-primary btn-sm"
                            disabled={!selectedClinicId[owner.id] || busyOwnerId === owner.id}
                            onClick={() => handleLink(owner.id)}
                          >
                            Hubungkan
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
}
