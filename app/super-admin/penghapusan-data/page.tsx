'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import SuperAdminLayout from '@/components/layout/SuperAdminLayout';
import CustomSelect from '@/components/form/CustomSelect';
import { Modal, Notice, PageHeader, StatusBadge, TableState, formatDate, formatDateTime } from '@/components/super-admin/ui';
import { superAdminApi, type RetentionRow } from '@/lib/super-admin';
import { featuresApi } from '@/lib/features';
import { ApiError } from '@/lib/api-client';
import { useToast } from '@/lib/toast-context';
import '../../styles/super-admin.css';

const POSTPONE_OPTIONS = [7, 14, 30, 60, 90].map((d) => ({ value: String(d), label: `${d} hari` }));

function timeLeft(row: RetentionRow) {
  if (row.purgedAt) return { label: 'Sudah dihapus', tone: 'neutral' as const };
  const d = row.daysLeft ?? 0;
  if (d < 0) return { label: 'Masa unduh lewat', tone: 'bad' as const };
  if (d <= 1) return { label: d === 0 ? 'Hari terakhir' : 'Besok', tone: 'bad' as const };
  if (d <= 7) return { label: `${d} hari lagi`, tone: 'warn' as const };
  return { label: `${d} hari lagi`, tone: 'info' as const };
}

/**
 * Klinik yang berhenti berlangganan: data bisa diunduh 15 hari, lalu
 * dihapus. Super Admin bisa menunda, mengunduh, atau menghapus sekarang.
 */
export default function PenghapusanDataPage() {
  const { success, error: showError } = useToast();
  const [rows, setRows] = useState<RetentionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoPurge, setAutoPurge] = useState<boolean | null>(null);
  const [postponing, setPostponing] = useState<RetentionRow | null>(null);
  const [days, setDays] = useState('14');
  const [purging, setPurging] = useState<RetentionRow | null>(null);
  const [confirmName, setConfirmName] = useState('');
  const [busy, setBusy] = useState(false);
  const [exportingId, setExportingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, settings] = await Promise.all([superAdminApi.retention(), featuresApi.platformSettings()]);
      setRows(list);
      setAutoPurge(!!settings.autoPurgeEnabled);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Gagal memuat jadwal penghapusan');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    void load();
  }, [load]);

  async function postpone() {
    if (!postponing) return;
    setBusy(true);
    try {
      const res = await superAdminApi.postponeDeletion(postponing.clinicId, Number(days));
      success(`Penghapusan ${postponing.clinicName} ditunda sampai ${formatDate(res.deleteAfter)}`);
      setPostponing(null);
      await load();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Gagal menunda');
    } finally {
      setBusy(false);
    }
  }

  async function purge() {
    if (!purging) return;
    setBusy(true);
    try {
      const res = await superAdminApi.purgeNow(purging.clinicId, confirmName);
      success(`Data ${purging.clinicName} dihapus (${res.filesRemoved} berkas).`);
      setPurging(null);
      setConfirmName('');
      await load();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Gagal menghapus data');
    } finally {
      setBusy(false);
    }
  }

  async function exportData(row: RetentionRow) {
    setExportingId(row.clinicId);
    try {
      await superAdminApi.exportClinic(row.clinicId);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Gagal mengunduh data');
    } finally {
      setExportingId(null);
    }
  }

  const scheduled = rows.filter((r) => !r.purgedAt);

  return (
    <SuperAdminLayout>
      <div className="sa-page">
        <PageHeader
          title="Penghapusan Data"
          count={scheduled.length}
          subtitle="Klinik yang berhenti berlangganan bisa mengunduh semua datanya selama 15 hari setelah langganan berakhir. Setelah itu data klinik dihapus permanen."
        />

        {autoPurge === false ? (
          <Notice tone="warn">
            Hapus otomatis sedang <strong>mati</strong>: klinik tetap dijadwalkan dan diberi tahu lewat email, tetapi data
            baru dihapus setelah Anda menekan &quot;Hapus sekarang&quot; atau menyalakan hapus otomatis di{' '}
            <Link href="/super-admin/pengaturan">Pengaturan Platform</Link>.
          </Notice>
        ) : autoPurge ? (
          <Notice tone="info">
            Hapus otomatis <strong>menyala</strong>: data dihapus sehari setelah masa unduh berakhir (setiap pukul 02.00).
          </Notice>
        ) : null}

        <div className="table-wrap">
          <table className="sa-table">
            <thead>
              <tr>
                <th>Klinik</th>
                <th>Langganan berakhir</th>
                <th>Bisa diunduh sampai</th>
                <th>Sisa</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <TableState loading={loading} empty={rows.length === 0} colSpan={5} message="Tidak ada klinik yang dijadwalkan dihapus." />
              {!loading &&
                rows.map((row) => {
                  const left = timeLeft(row);
                  return (
                    <tr key={row.clinicId}>
                      <td className="cell-strong">
                        <Link href={`/super-admin/clinics/${row.clinicId}`}>{row.clinicName}</Link>
                      </td>
                      <td>{formatDate(row.lastEndDate)}</td>
                      <td>{row.purgedAt ? `Dihapus ${formatDateTime(row.purgedAt)}` : formatDate(row.deleteAfter)}</td>
                      <td>
                        <StatusBadge tone={left.tone}>{left.label}</StatusBadge>
                      </td>
                      <td className="cell-actions">
                        {!row.purgedAt && (
                          <>
                            <button
                              type="button"
                              className="btn-outline btn-sm"
                              onClick={() => exportData(row)}
                              disabled={exportingId === row.clinicId}
                            >
                              {exportingId === row.clinicId ? 'Menyiapkan...' : 'Unduh data'}
                            </button>
                            <button type="button" className="btn-outline btn-sm" onClick={() => { setDays('14'); setPostponing(row); }}>
                              Tunda
                            </button>
                            <button type="button" className="btn-danger btn-sm" onClick={() => { setConfirmName(''); setPurging(row); }}>
                              Hapus sekarang
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {postponing && (
        <Modal
          title={`Tunda penghapusan ${postponing.clinicName}`}
          onClose={() => setPostponing(null)}
          busy={busy}
          footer={
            <>
              <button type="button" className="btn-outline" onClick={() => setPostponing(null)} disabled={busy}>
                Batal
              </button>
              <button type="button" className="btn-primary" onClick={postpone} disabled={busy}>
                {busy ? 'Menyimpan...' : 'Tunda'}
              </button>
            </>
          }
        >
          <p className="text-sub">
            Saat ini data bisa diunduh sampai {formatDate(postponing.deleteAfter)}. Owner diberi tahu lagi H-7 dan H-1 dari
            tanggal baru.
          </p>
          <div className="sa-field">
            <label>Tunda selama</label>
            <CustomSelect value={days} onChange={setDays} options={POSTPONE_OPTIONS} />
          </div>
        </Modal>
      )}

      {purging && (
        <Modal
          title={`Hapus data ${purging.clinicName}?`}
          onClose={() => setPurging(null)}
          busy={busy}
          footer={
            <>
              <button type="button" className="btn-outline" onClick={() => setPurging(null)} disabled={busy}>
                Batal
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={purge}
                disabled={busy || confirmName.trim() !== purging.clinicName.trim()}
              >
                {busy ? 'Menghapus...' : 'Hapus permanen'}
              </button>
            </>
          }
        >
          <Notice tone="bad">
            Semua pasien, rekam medis, tagihan pasien, foto, dan akun klinik ini dihapus permanen dan tidak bisa
            dikembalikan. Riwayat langganan dan pembayaran ke ApexRecord tetap disimpan.
          </Notice>
          {(purging.daysLeft ?? 0) >= 0 && (
            <Notice tone="warn">Masa unduh klinik ini belum berakhir ({formatDate(purging.deleteAfter)}).</Notice>
          )}
          <div className="sa-field">
            <label htmlFor="purge-confirm">
              Ketik <strong>{purging.clinicName}</strong> untuk konfirmasi
            </label>
            <input id="purge-confirm" type="text" value={confirmName} onChange={(e) => setConfirmName(e.target.value)} autoComplete="off" />
          </div>
        </Modal>
      )}
    </SuperAdminLayout>
  );
}
