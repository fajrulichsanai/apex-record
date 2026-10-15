'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import SuperAdminLayout from '@/components/layout/SuperAdminLayout';
import CustomSelect from '@/components/form/CustomSelect';
import {
  Modal,
  Notice,
  PageHeader,
  SkeletonBlock,
  StatusBadge,
  TableState,
  Tabs,
  formatDate,
  formatDateTime,
} from '@/components/super-admin/ui';
import { SATUSEHAT_STATUS, clinicStatus } from '@/components/super-admin/clinic-status';
import ClinicNotesCard from '@/components/super-admin/ClinicNotesCard';
import InviteUserModal, { ROLE_LABEL } from '@/components/super-admin/InviteUserModal';
import LoginAsModal from '@/components/super-admin/LoginAsModal';
import SatusehatClinicPanel from '@/components/super-admin/SatusehatClinicPanel';
import PatientMigrationPanel from '@/components/super-admin/PatientMigrationPanel';
import ClinicFeaturesCard from '@/components/features/ClinicFeaturesCard';
import UserFeaturesModal from '@/components/features/UserFeaturesModal';
import StorageAdjustCard from '@/components/storage/StorageAdjustCard';
import { paymentDetail } from '@/components/subscription/pricing';
import { clinicSubscriptionApi, paymentApi, subscriptionPlanApi } from '@/lib/subscription';
import { superAdminApi, type AdminUserRow } from '@/lib/super-admin';
import type { ClinicSubscription, ClinicSubscriptionSummary, Payment, SubscriptionPlan } from '@/types/subscription';
import { ApiError, openProtectedFile } from '@/lib/api-client';
import { useToast } from '@/lib/toast-context';
import { formatCurrency } from '@/lib/format';
import '../../../styles/super-admin.css';

const TABS = [
  { key: 'ringkasan', label: 'Ringkasan' },
  { key: 'langganan', label: 'Langganan & Pembayaran' },
  { key: 'pengguna', label: 'Pengguna' },
  { key: 'fitur', label: 'Fitur' },
  { key: 'satusehat', label: 'SATUSEHAT' },
  { key: 'migrasi', label: 'Migrasi Pasien' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

const PAYMENT_STATUS: Record<string, { label: string; tone: 'ok' | 'bad' | 'warn' }> = {
  confirmed: { label: 'Lunas', tone: 'ok' },
  rejected: { label: 'Ditolak', tone: 'bad' },
  pending: { label: 'Menunggu', tone: 'warn' },
};

export default function SuperAdminClinicDetailPage() {
  return (
    <SuperAdminLayout>
      <Suspense>
        <ClinicDetail />
      </Suspense>
    </SuperAdminLayout>
  );
}

/** Satu klinik, satu halaman (PRD KL-03..07): semua urusan klinik dalam tab. */
function ClinicDetail() {
  const params = useParams();
  const search = useSearchParams();
  const clinicId = Number(params?.id);
  const requested = search.get('tab') as TabKey | null;
  const tab: TabKey = TABS.some((t) => t.key === requested) ? (requested as TabKey) : 'ringkasan';
  const { success, error: showError } = useToast();

  const [row, setRow] = useState<ClinicSubscriptionSummary | null>(null);
  const [history, setHistory] = useState<ClinicSubscription[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [clinicName, setClinicName] = useState<string | null>(null);

  const [extendOpen, setExtendOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [featuresUser, setFeaturesUser] = useState<AdminUserRow | null>(null);
  const [loginAs, setLoginAs] = useState<{ id: number; name: string; email: string } | null>(null);
  const [inviting, setInviting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [hist, planList, userPage, paymentPage] = await Promise.all([
        clinicSubscriptionApi.getForClinic(clinicId),
        subscriptionPlanApi.list(),
        superAdminApi.users({ clinicId, limit: 100 }),
        paymentApi.listQueue({ clinicId, limit: 50 }),
      ]);
      setHistory(hist);
      setPlans(planList.filter((p) => p.isActive));
      setUsers(userPage.data);
      setPayments(paymentPage.data);
      const name = hist[0]?.clinicName ?? userPage.data[0]?.clinicName ?? null;
      setClinicName(name);
      if (name) {
        const list = await clinicSubscriptionApi.listAll({ search: name, page: 1, limit: 50 });
        setRow(list.data.find((r) => r.clinicId === clinicId) ?? null);
      }
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Gagal memuat data klinik');
    } finally {
      setLoading(false);
    }
  }, [clinicId, showError]);

  useEffect(() => {
    if (clinicId) void load();
  }, [clinicId, load]);

  const current = history[0] || null;
  const name = row?.clinicName ?? clinicName ?? `Klinik #${clinicId}`;
  const status = clinicStatus(current, row ?? undefined);
  const owner = users.find((u) => u.role === 'owner' && u.isActive) ?? null;
  const purged = !!row?.dataPurgedAt;

  const handleExtend = async () => {
    if (!selectedPlanId) {
      showError('Pilih paket langganan terlebih dahulu');
      return;
    }
    setSubmitting(true);
    try {
      await clinicSubscriptionApi.manualExtend({ clinicId, planId: Number(selectedPlanId), notes: notes || undefined });
      success('Langganan klinik berhasil diperpanjang');
      setExtendOpen(false);
      setSelectedPlanId('');
      setNotes('');
      void load();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Gagal memperpanjang langganan');
    } finally {
      setSubmitting(false);
    }
  };

  const exportData = async () => {
    setExporting(true);
    try {
      await superAdminApi.exportClinic(clinicId);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Gagal mengunduh data klinik');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="sa-page">
      <PageHeader
        breadcrumb={[
          { label: 'Klinik', href: '/super-admin/clinics' },
          { label: name, href: tab === 'ringkasan' ? undefined : `/super-admin/clinics/${clinicId}` },
          ...(tab === 'ringkasan' ? [] : [{ label: TABS.find((t) => t.key === tab)!.label }]),
        ]}
        title={name}
        badge={
          !loading && (
            <StatusBadge tone={status.tone} title={status.hint}>
              {status.label}
            </StatusBadge>
          )
        }
        subtitle={status.hint}
        actions={
          !purged && (
            <button type="button" className="btn-primary" onClick={() => setExtendOpen(true)}>
              Perpanjang manual
            </button>
          )
        }
      />

      <Tabs active={tab} hrefFor={(k) => `/super-admin/clinics/${clinicId}${k === 'ringkasan' ? '' : `?tab=${k}`}`} tabs={[...TABS]} />

      {purged && (
        <Notice tone="bad">
          Data klinik ini sudah dihapus pada {formatDateTime(row?.dataPurgedAt)} setelah berhenti berlangganan. Yang tersisa
          hanya riwayat langganan dan pembayaran.
        </Notice>
      )}

      {tab === 'ringkasan' &&
        (loading ? (
          <SkeletonBlock lines={4} />
        ) : (
          <>
            <div className="sa-grid-2">
              <div className="card">
                <h3>Klinik</h3>
                <dl className="sa-kv">
                  <dt>Owner</dt>
                  <dd>
                    {row?.owner ? (
                      <>
                        {row.owner.name}
                        <span className="cell-sub">{row.owner.email}</span>
                      </>
                    ) : (
                      '-'
                    )}
                  </dd>
                  <dt>Multi-klinik</dt>
                  <dd>
                    {row?.multiClinicOwner ? (
                      <Link href="/super-admin/multi-clinic-owners">{row.multiClinicOwner.name}</Link>
                    ) : (
                      'Tidak terhubung'
                    )}
                  </dd>
                  <dt>Akun aktif</dt>
                  <dd>{row?.activeUsers ?? users.filter((u) => u.isActive).length}</dd>
                  <dt>SATUSEHAT</dt>
                  <dd>
                    {row?.satusehatStatus ? (
                      <Link href={`/super-admin/clinics/${clinicId}?tab=satusehat`}>
                        <StatusBadge tone={SATUSEHAT_STATUS[row.satusehatStatus].tone}>
                          {SATUSEHAT_STATUS[row.satusehatStatus].label}
                        </StatusBadge>
                      </Link>
                    ) : (
                      '-'
                    )}
                  </dd>
                  <dt>Terdaftar</dt>
                  <dd>{formatDate(row?.createdAt)}</dd>
                  <dt>Aktivitas</dt>
                  <dd>
                    Login terakhir {formatDateTime(row?.lastLoginAt)} · {row?.visits30 ?? 0} kunjungan 30 hari
                  </dd>
                </dl>
                <div className="sa-row card-actions">
                  {owner && (
                    <button
                      type="button"
                      className="btn-outline btn-sm"
                      onClick={() => setLoginAs({ id: owner.id, name: owner.name, email: owner.email })}
                    >
                      Login sebagai owner
                    </button>
                  )}
                  <Link href={`/super-admin/audit-log?clinicId=${clinicId}`} className="btn-outline btn-sm">
                    Log aktivitas klinik
                  </Link>
                </div>
              </div>

              <div className="card">
                <h3>Langganan</h3>
                {current ? (
                  <dl className="sa-kv">
                    <dt>Paket</dt>
                    <dd>{current.plan?.name ?? '-'}</dd>
                    <dt>Berlaku</dt>
                    <dd>
                      {formatDate(current.startDate)} – {formatDate(current.endDate)}
                    </dd>
                    <dt>Status</dt>
                    <dd>
                      <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                    </dd>
                  </dl>
                ) : (
                  <p className="text-sub">Klinik ini belum pernah berlangganan.</p>
                )}
                <div className="sa-row card-actions">
                  <Link href={`/super-admin/clinics/${clinicId}?tab=langganan`} className="btn-outline btn-sm">
                    Riwayat &amp; pembayaran
                  </Link>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <h3>Data klinik</h3>
                {!purged && (
                  <button type="button" className="btn-outline btn-sm" onClick={exportData} disabled={exporting}>
                    {exporting ? 'Menyiapkan ZIP...' : 'Unduh semua data'}
                  </button>
                )}
              </div>
              {row?.dataDeleteAfter && !purged ? (
                <Notice tone="warn">
                  Langganan berhenti. Data bisa diunduh sampai <strong>{formatDate(row.dataDeleteAfter)}</strong>, lalu
                  dihapus. Tunda atau hapus sekarang di{' '}
                  <Link href="/super-admin/penghapusan-data">Penghapusan Data</Link>.
                </Notice>
              ) : (
                <p className="text-sub">
                  ZIP berisi Excel per jenis data (pasien, kunjungan, rekam medis, tagihan, dll.) dan berkas foto. Owner
                  klinik bisa mengunduh yang sama dari Pengaturan › Data &amp; Privasi.
                </p>
              )}
            </div>

            <ClinicNotesCard clinicId={clinicId} />

            {!purged && <StorageAdjustCard clinicId={clinicId} />}
          </>
        ))}

      {tab === 'langganan' && (
        <>
          <div className="card">
            <h3>Riwayat langganan</h3>
            <div className="table-wrap table-plain">
              <table className="sa-table">
                <thead>
                  <tr>
                    <th>Paket</th>
                    <th>Mulai</th>
                    <th>Berakhir</th>
                    <th>Status</th>
                    <th>Catatan</th>
                  </tr>
                </thead>
                <tbody>
                  <TableState loading={loading} empty={history.length === 0} colSpan={5} message="Klinik ini belum pernah berlangganan." />
                  {!loading &&
                    history.map((h) => (
                      <tr key={h.id}>
                        <td className="cell-strong">{h.plan?.name}</td>
                        <td>{formatDate(h.startDate)}</td>
                        <td>{formatDate(h.endDate)}</td>
                        <td>
                          <StatusBadge tone={h.status === 'active' ? 'ok' : 'neutral'}>
                            {h.status === 'active' ? 'Aktif' : 'Kadaluarsa'}
                          </StatusBadge>
                        </td>
                        <td className="cell-wrap">{h.notes || '-'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <h3>Pembayaran</h3>
            <div className="table-wrap table-plain">
              <table className="sa-table">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Paket</th>
                    <th>Rincian</th>
                    <th>Jumlah</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  <TableState loading={loading} empty={payments.length === 0} colSpan={6} message="Belum ada pembayaran dari klinik ini." />
                  {!loading &&
                    payments.map((p) => (
                      <tr key={p.id}>
                        <td className="col-time">{formatDateTime(p.createdAt)}</td>
                        <td>{p.plan?.name ?? '-'}</td>
                        <td>{paymentDetail(p)}</td>
                        <td className="cell-nowrap">Rp {formatCurrency(p.amount)}</td>
                        <td>
                          <StatusBadge tone={PAYMENT_STATUS[p.status]?.tone ?? 'neutral'}>
                            {PAYMENT_STATUS[p.status]?.label ?? p.status}
                          </StatusBadge>
                        </td>
                        <td className="cell-actions">
                          {p.status === 'confirmed' && (
                            <Link href={`/kuitansi/${p.id}`} className="btn-outline btn-sm" target="_blank">
                              Kuitansi
                            </Link>
                          )}
                          {p.proofUrl && (
                            <button
                              type="button"
                              className="sa-link"
                              onClick={() => openProtectedFile(p.proofUrl!).catch(() => showError('Gagal memuat bukti'))}
                            >
                              Bukti
                            </button>
                          )}
                          {p.status === 'pending' && <Link href="/super-admin/payments">Konfirmasi</Link>}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'pengguna' && (
        <div className="card">
          <div className="card-head">
            <h3>Pengguna klinik</h3>
            {!purged && (
              <button type="button" className="btn-outline btn-sm" onClick={() => setInviting(true)}>
                + Undang pengguna
              </button>
            )}
          </div>
          <div className="table-wrap table-plain">
            <table className="sa-table">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Email</th>
                  <th>Peran</th>
                  <th>Status</th>
                  <th>Login terakhir</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <TableState loading={loading} empty={users.length === 0} colSpan={6} message="Belum ada pengguna di klinik ini." />
                {!loading &&
                  users.map((u) => (
                    <tr key={u.id}>
                      <td className="cell-strong">{u.name}</td>
                      <td>{u.email}</td>
                      <td>{ROLE_LABEL[u.role] || u.role}</td>
                      <td>
                        <StatusBadge tone={u.isActive ? 'ok' : 'neutral'}>{u.isActive ? 'Aktif' : 'Nonaktif'}</StatusBadge>
                      </td>
                      <td className="col-time">{formatDateTime(u.lastLoginAt)}</td>
                      <td className="cell-actions">
                        {['owner', 'admin', 'dokter', 'perawat', 'manajer_cabang'].includes(u.role) && (
                          <button type="button" className="btn-outline btn-sm" onClick={() => setFeaturesUser(u)}>
                            Atur fitur
                          </button>
                        )}
                        {u.isActive && (
                          <button
                            type="button"
                            className="btn-outline btn-sm"
                            onClick={() => setLoginAs({ id: u.id, name: u.name, email: u.email })}
                          >
                            Login sebagai
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'fitur' && <ClinicFeaturesCard clinicId={clinicId} />}

      {tab === 'satusehat' && <SatusehatClinicPanel clinicId={clinicId} />}

      {tab === 'migrasi' &&
        (purged ? (
          <Notice tone="neutral">Data klinik ini sudah dihapus.</Notice>
        ) : (
          <PatientMigrationPanel clinicId={clinicId} clinicName={name} />
        ))}

      <UserFeaturesModal user={featuresUser} onClose={() => setFeaturesUser(null)} />
      {loginAs && <LoginAsModal target={loginAs} onClose={() => setLoginAs(null)} />}
      {inviting && (
        <InviteUserModal fixedClinicId={clinicId} onClose={() => setInviting(false)} onCreated={() => void load()} />
      )}

      {extendOpen && (
        <Modal
          title="Perpanjang langganan"
          onClose={() => setExtendOpen(false)}
          busy={submitting}
          footer={
            <>
              <button type="button" className="btn-outline" onClick={() => setExtendOpen(false)} disabled={submitting}>
                Batal
              </button>
              <button type="button" className="btn-primary" onClick={handleExtend} disabled={submitting}>
                {submitting ? 'Memproses...' : 'Perpanjang'}
              </button>
            </>
          }
        >
          <div className="sa-field">
            <label>Paket langganan</label>
            <CustomSelect
              value={selectedPlanId}
              onChange={setSelectedPlanId}
              options={plans.map((p) => ({
                value: String(p.id),
                label: `${p.name} — Rp ${formatCurrency(Number(p.effectivePrice ?? p.price))} / ${p.durationDays} hari`,
              }))}
              placeholder="Pilih paket"
            />
          </div>
          <div className="sa-field">
            <label htmlFor="extend-notes">Catatan (opsional)</label>
            <textarea
              id="extend-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: konfirmasi transfer manual via WA"
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
