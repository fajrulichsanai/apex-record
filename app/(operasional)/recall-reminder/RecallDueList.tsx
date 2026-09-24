'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ApiError } from '@/lib/api-client';
import { patientRecallApi, type PatientRecall, type PatientRecallStatus } from '@/lib/recall';
import { useToast } from '@/lib/toast-context';
import { waLink } from '@/lib/utils/whatsapp';

type FilterValue = 'semua' | PatientRecallStatus;

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isOverdue(dueDate: string) {
  const today = new Date(new Date().toDateString());
  return new Date(`${dueDate}T00:00:00`) < today;
}

function statusTag(status: PatientRecallStatus) {
  if (status === 'sudah_dihubungi') return { cls: 'tag-dihubungi', label: 'Sudah Dihubungi' };
  if (status === 'sudah_booking_ulang') return { cls: 'tag-booking', label: 'Sudah Booking Ulang' };
  return { cls: 'tag-belum', label: 'Belum Dihubungi' };
}

interface RecallDueListProps {
  clinicName?: string;
}

export default function RecallDueList({ clinicName }: RecallDueListProps) {
  const { success, error } = useToast();
  const [filter, setFilter] = useState<FilterValue>('semua');
  const [recalls, setRecalls] = useState<PatientRecall[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const load = async (status?: PatientRecallStatus) => {
    try {
      setLoading(true);
      const res = await patientRecallApi.list({ status, limit: 100 });
      setRecalls(res.data);
    } catch (err) {
      error(err instanceof ApiError ? err.message : 'Gagal memuat daftar recall');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(filter === 'semua' ? undefined : filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const handleUpdateStatus = async (recall: PatientRecall, status: PatientRecallStatus) => {
    setUpdatingId(recall.id);
    try {
      await patientRecallApi.update(recall.id, { status });
      success('Status recall diperbarui');
      await load(filter === 'semua' ? undefined : filter);
    } catch (err) {
      error(err instanceof ApiError ? err.message : 'Gagal memperbarui status recall');
    } finally {
      setUpdatingId(null);
    }
  };

  const waText = (recall: PatientRecall) =>
    `Halo Kak ${recall.patient?.name ?? ''}, sudah waktunya kontrol ${recall.tarif?.name ?? ''} di ${clinicName ?? 'klinik kami'}. Mau dijadwalkan kapan?`;

  return (
    <>
      <div className="tab-bar" style={{ marginBottom: 4 }}>
        <button type="button" className={`filter-tab ${filter === 'semua' ? 'active' : ''}`} onClick={() => setFilter('semua')}>
          Semua
        </button>
        <button type="button" className={`filter-tab ${filter === 'belum_dihubungi' ? 'active' : ''}`} onClick={() => setFilter('belum_dihubungi')}>
          Belum Dihubungi
        </button>
        <button type="button" className={`filter-tab ${filter === 'sudah_dihubungi' ? 'active' : ''}`} onClick={() => setFilter('sudah_dihubungi')}>
          Sudah Dihubungi
        </button>
        <button type="button" className={`filter-tab ${filter === 'sudah_booking_ulang' ? 'active' : ''}`} onClick={() => setFilter('sudah_booking_ulang')}>
          Sudah Booking Ulang
        </button>
      </div>

      <div className="panel">
        {loading ? (
          <div className="empty-list">
            <div className="empty-icon-wrap">
              <span className="material-symbols-rounded">hourglass_empty</span>
            </div>
            <div className="empty-title">Memuat daftar recall...</div>
          </div>
        ) : recalls.length === 0 ? (
          <div className="empty-list">
            <div className="empty-icon-wrap">
              <span className="material-symbols-rounded">event_available</span>
            </div>
            <div className="empty-title">Tidak ada pasien yang perlu dihubungi</div>
            <div className="empty-sub">Jadwal recall muncul otomatis saat tindakan dengan interval recall dibuatkan tagihan.</div>
          </div>
        ) : (
          <div className="fee-table-wrap">
            <table className="fee-table">
              <thead>
                <tr>
                  <th>Pasien</th>
                  <th>Tindakan</th>
                  <th>Jatuh Tempo</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {recalls.map((recall) => {
                  const { cls, label } = statusTag(recall.status);
                  const overdue = recall.status === 'belum_dihubungi' && isOverdue(recall.dueDate);
                  return (
                    <tr key={recall.id}>
                      <td>
                        <div className="tarif-name">{recall.patient?.name ?? `Pasien #${recall.patientId}`}</div>
                        {recall.patient?.noRm && <div className="tarif-kategori">{recall.patient.noRm}</div>}
                      </td>
                      <td>{recall.tarif?.name ?? '-'}</td>
                      <td className={overdue ? 'overdue' : undefined}>{formatDate(recall.dueDate)}</td>
                      <td>
                        <span className={`tag ${cls}`}>{label}</span>
                      </td>
                      <td>
                        <div className="row-actions">
                          {recall.patient?.phone && (
                            <a
                              className="btn-wa"
                              href={waLink(recall.patient.phone, waText(recall))}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => {
                                if (recall.status === 'belum_dihubungi') handleUpdateStatus(recall, 'sudah_dihubungi');
                              }}
                            >
                              <span className="material-symbols-rounded" style={{ fontSize: 16 }}>chat</span>
                              Hubungi via WA
                            </a>
                          )}
                          {recall.upcomingReservation ? (
                            <Link
                              className="btn-row-save"
                              href={`/reservasi?search=${encodeURIComponent(recall.patient?.phone || '')}`}
                            >
                              <span className="material-symbols-rounded" style={{ fontSize: 16 }}>event_available</span>
                              Lihat Reservasi
                            </Link>
                          ) : (
                            recall.status !== 'sudah_booking_ulang' && (
                              <button
                                type="button"
                                className="btn-row-save"
                                disabled={updatingId === recall.id}
                                onClick={() => handleUpdateStatus(recall, 'sudah_booking_ulang')}
                              >
                                Sudah Booking
                              </button>
                            )
                          )}
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
    </>
  );
}
