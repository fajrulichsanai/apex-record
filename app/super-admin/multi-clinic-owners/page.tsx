'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import SuperAdminLayout from '@/components/layout/SuperAdminLayout';
import CustomSelect from '@/components/form/CustomSelect';
import { multiClinicApi, type BranchLink, type LinkStatus, type MultiClinicOwner } from '@/lib/multi-clinic';
import { apiClient, ApiError } from '@/lib/api-client';
import { useEscapeKey } from '@/lib/a11y';
import StorageAdjustCard from '@/components/storage/StorageAdjustCard';
import type { Clinic } from '@/types/clinic';
import '../../styles/super-admin.css';
import '../../styles/multi-klinik.css';

const STATUS: Record<LinkStatus, { label: string; tone: string }> = {
  approved: { label: 'Terhubung', tone: 'ok' },
  pending: { label: 'Menunggu persetujuan', tone: 'warn' },
  rejected: { label: 'Ditolak', tone: 'bad' },
  expired: { label: 'Kedaluwarsa', tone: '' },
};

const BILLING: Record<string, string> = {
  owner: 'ditanggung owner',
  self: 'bayar sendiri',
  stopped: 'berhenti',
};

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

type Mode = 'request' | 'direct';

export default function MultiClinicOwnersPage() {
  const [owners, setOwners] = useState<MultiClinicOwner[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<number, string>>({});
  const [mode, setMode] = useState<Record<number, Mode>>({});
  const [busyOwnerId, setBusyOwnerId] = useState<number | null>(null);
  const [unlinking, setUnlinking] = useState<{ owner: MultiClinicOwner; link: BranchLink } | null>(null);
  useEscapeKey(() => setUnlinking(null), !!unlinking);

  const load = useCallback(async () => {
    try {
      const [ownersData, clinicsData] = await Promise.all([
        multiClinicApi.listOwners(),
        apiClient.get<Clinic[]>('/clinics'),
      ]);
      setOwners(ownersData);
      setClinics(clinicsData);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // One clinic, one multiklinik owner (PRD PS-04): a clinic already linked or
  // pending anywhere can't be offered again.
  const takenClinicIds = useMemo(() => {
    const taken = new Set<number>();
    for (const o of owners) {
      for (const l of o.links ?? []) {
        if (l.status === 'approved' || l.status === 'pending') taken.add(l.clinicId);
      }
    }
    return taken;
  }, [owners]);

  const handleLink = async (owner: MultiClinicOwner) => {
    const clinicId = Number(selected[owner.id]);
    if (!clinicId) return;
    const direct = (mode[owner.id] ?? 'request') === 'direct';
    setBusyOwnerId(owner.id);
    setError(null);
    try {
      await multiClinicApi.linkClinic(owner.id, clinicId, direct);
      const clinicName = clinics.find((c) => c.id === clinicId)?.name ?? 'Klinik';
      setNotice(
        direct
          ? `${clinicName} langsung terhubung ke ${owner.name}.`
          : `Permintaan terkirim. ${clinicName} akan terhubung setelah owner kliniknya menyetujui (maks. 90 hari).`,
      );
      setSelected((s) => ({ ...s, [owner.id]: '' }));
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal mengajukan hubungan');
    } finally {
      setBusyOwnerId(null);
    }
  };

  const confirmUnlink = async () => {
    if (!unlinking) return;
    const { owner, link } = unlinking;
    setBusyOwnerId(owner.id);
    try {
      await multiClinicApi.unlinkClinic(owner.id, link.clinicId);
      setNotice(
        link.status === 'approved'
          ? `${link.clinicName ?? 'Klinik'} diputus dari ${owner.name}. Langganannya tetap aktif sampai akhir periode.`
          : `${link.status === 'pending' ? 'Permintaan dibatalkan' : 'Riwayat dihapus'}: ${link.clinicName ?? 'klinik'}.`,
      );
      setUnlinking(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal memutus hubungan');
    } finally {
      setBusyOwnerId(null);
    }
  };

  return (
    <SuperAdminLayout>
      <div className="sa-page mk-scope">
        <div className="page-header">
          <div className="page-title-block">
            <div className="page-title">
              <h1>Multi-Klinik Owner</h1>
            </div>
            <p className="page-subtitle">
              Buat akunnya dulu di User Management dengan role &quot;Multi-Klinik Owner&quot;. Klinik yang sudah ada
              dihubungkan lewat persetujuan owner kliniknya; klinik baru yang dibuat untuk owner ini bisa dihubungkan
              langsung. Satu klinik hanya boleh punya satu owner multiklinik.
            </p>
          </div>
        </div>

        {error && <div className="mk-alert bad">{error}</div>}
        {notice && !error && <div className="mk-alert info">{notice}</div>}

        {loading ? (
          <p>Memuat...</p>
        ) : owners.length === 0 ? (
          <div className="mk-alert">Belum ada akun dengan role Multi-Klinik Owner.</div>
        ) : (
          <div className="mk-page" style={{ maxWidth: 'none' }}>
            {owners.map((owner) => {
              const links = owner.links ?? owner.clinics.map((c) => ({
                id: c.id,
                clinicId: c.id,
                clinicName: c.name,
                status: 'approved' as const,
                billingMode: 'owner' as const,
                requestedAt: null,
                respondedAt: null,
                expiresAt: null,
              }));
              const available = clinics.filter((c) => !takenClinicIds.has(c.id));
              const ownerMode = mode[owner.id] ?? 'request';
              return (
                <div key={owner.id} className="mk-card">
                  <div className="mk-card-head">
                    <div>
                      <h2>{owner.name}</h2>
                      <span className="mk-muted">
                        {owner.email}
                        {!owner.isActive && ' · nonaktif'}
                      </span>
                    </div>
                    <span className="mk-pill">
                      {links.filter((l) => l.status === 'approved').length} cabang terhubung
                    </span>
                  </div>

                  {links.length === 0 ? (
                    <p className="mk-hint">Belum ada klinik.</p>
                  ) : (
                    <div className="mk-table-wrap">
                      <table className="mk-table">
                        <thead>
                          <tr>
                            <th>Klinik</th>
                            <th>Status</th>
                            <th>Tanggal</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {links.map((l) => (
                            <tr key={l.id}>
                              <td className="name">
                                {l.clinicName ?? `Klinik #${l.clinicId}`}
                                {l.status === 'approved' && <small>{BILLING[l.billingMode] ?? l.billingMode}</small>}
                              </td>
                              <td>
                                <span className={`mk-pill ${STATUS[l.status].tone}`}>{STATUS[l.status].label}</span>
                              </td>
                              <td className="mk-muted">
                                {l.status === 'pending'
                                  ? `Diajukan ${formatDate(l.requestedAt)} · kedaluwarsa ${formatDate(l.expiresAt)}`
                                  : l.respondedAt
                                    ? `Dijawab ${formatDate(l.respondedAt)}`
                                    : formatDate(l.requestedAt)}
                              </td>
                              <td className="r">
                                <button
                                  type="button"
                                  className="mk-btn sm danger"
                                  disabled={busyOwnerId === owner.id}
                                  onClick={() => setUnlinking({ owner, link: l })}
                                >
                                  {l.status === 'approved' ? 'Putuskan' : l.status === 'pending' ? 'Batalkan' : 'Hapus'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <details>
                    <summary className="mk-muted" style={{ cursor: 'pointer' }}>Storage bersama</summary>
                    <StorageAdjustCard ownerId={owner.id} compact />
                  </details>

                  <div className="mk-filters" style={{ alignItems: 'center' }}>
                    <div style={{ minWidth: 220, flex: '1 1 220px', maxWidth: 360 }}>
                      <CustomSelect
                        value={selected[owner.id] || ''}
                        onChange={(value) => setSelected((s) => ({ ...s, [owner.id]: value }))}
                        options={available.map((c) => ({ value: c.id.toString(), label: c.name }))}
                        placeholder={available.length ? 'Pilih klinik…' : 'Semua klinik sudah terhubung'}
                      />
                    </div>
                    <label className="mk-field" style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <input
                        type="radio"
                        name={`mode-${owner.id}`}
                        checked={ownerMode === 'request'}
                        onChange={() => setMode((m) => ({ ...m, [owner.id]: 'request' }))}
                      />
                      Ajukan ke owner klinik
                    </label>
                    <label className="mk-field" style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <input
                        type="radio"
                        name={`mode-${owner.id}`}
                        checked={ownerMode === 'direct'}
                        onChange={() => setMode((m) => ({ ...m, [owner.id]: 'direct' }))}
                      />
                      Hubungkan langsung (klinik baru milik owner ini)
                    </label>
                    <button
                      type="button"
                      className="mk-btn primary"
                      disabled={!selected[owner.id] || busyOwnerId === owner.id}
                      onClick={() => handleLink(owner)}
                    >
                      {ownerMode === 'direct' ? 'Hubungkan' : 'Ajukan hubungan'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {unlinking && (
          <div className="mk-overlay" role="presentation" onClick={() => setUnlinking(null)}>
            <div
              className="mk-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="mk-unlink-title"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="mk-unlink-title">
                {unlinking.link.status === 'approved'
                  ? `Putuskan ${unlinking.link.clinicName ?? 'klinik'}?`
                  : unlinking.link.status === 'pending'
                    ? 'Batalkan permintaan?'
                    : 'Hapus riwayat permintaan?'}
              </h2>
              <p className="mk-hint">
                {unlinking.link.status === 'approved'
                  ? `Klinik hilang dari dashboard ${unlinking.owner.name}. Data dan akun klinik tidak terhapus, dan langganannya tetap aktif sampai akhir periode yang sudah dibayar.`
                  : 'Klinik bisa diajukan lagi kapan saja.'}
              </p>
              <div className="mk-actions">
                <button type="button" className="mk-btn" onClick={() => setUnlinking(null)}>
                  Batal
                </button>
                <button
                  type="button"
                  className="mk-btn danger"
                  disabled={busyOwnerId === unlinking.owner.id}
                  onClick={confirmUnlink}
                >
                  {unlinking.link.status === 'approved' ? 'Ya, putuskan' : 'Ya, lanjutkan'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
}
