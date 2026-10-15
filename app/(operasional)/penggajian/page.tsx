'use client';

import { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FeatureGuard from '@/components/auth/FeatureGuard';
import ConfirmationModal from '@/components/feedback/ConfirmationModal';
import { useFeatures } from '@/lib/features-context';
import { useToast } from '@/lib/toast-context';
import { ApiError, downloadProtectedFile } from '@/lib/api-client';
import { formatCurrencyInput, parseCurrency } from '@/lib/format';
import {
  payrollApi,
  ROLE_LABEL,
  type PayrollEmployee,
  type PayrollRow,
  type PayrollView,
} from '@/lib/payroll';
import '../../styles/share-fee-dokter.css';
import '../../styles/payroll.css';

type Tab = 'bulanan' | 'pegawai';

const rp = (n: number) => `Rp ${Math.round(Number(n || 0)).toLocaleString('id-ID')}`;
const thisMonth = () => new Date().toISOString().slice(0, 7);
const errMsg = (err: unknown, fallback: string) => (err instanceof ApiError ? err.message : fallback);

/** Input rupiah yang menyimpan saat fokus lepas (bila nilainya berubah). */
function MoneyInput({
  value,
  disabled,
  label,
  onCommit,
}: {
  value: number;
  disabled?: boolean;
  label: string;
  onCommit: (n: number) => void;
}) {
  const [text, setText] = useState(String(Math.round(value || 0)));
  useEffect(() => setText(String(Math.round(value || 0))), [value]);
  return (
    <input
      className="fee-value-input payroll-money"
      inputMode="numeric"
      aria-label={label}
      disabled={disabled}
      value={formatCurrencyInput(text)}
      onChange={(e) => setText(e.target.value.replace(/\D/g, ''))}
      onBlur={() => {
        const n = parseCurrency(text) || 0;
        if (n !== Math.round(value || 0)) onCommit(n);
      }}
    />
  );
}

function MonthlyTab() {
  const { success, error: showError } = useToast();
  const [period, setPeriod] = useState(thisMonth());
  const [view, setView] = useState<PayrollView | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmPay, setConfirmPay] = useState(false);
  const [confirmReopen, setConfirmReopen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setView(await payrollApi.run(period));
    } catch (err) {
      showError(errMsg(err, 'Gagal memuat payroll'));
    } finally {
      setLoading(false);
    }
  }, [period, showError]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (fn: () => Promise<PayrollView>, ok: string) => {
    setBusy(true);
    try {
      setView(await fn());
      success(ok);
    } catch (err) {
      showError(errMsg(err, 'Gagal memproses payroll'));
    } finally {
      setBusy(false);
    }
  };

  const updateRow = (row: PayrollRow, body: { bonus?: number; deduction?: number; note?: string }) => {
    if (!row.id) return;
    void act(() => payrollApi.updateItem(period, row.id!, body), `Gaji ${row.name} diperbarui`);
  };

  const download = (path: string, name: string) =>
    downloadProtectedFile(path, name).catch((err) => showError(errMsg(err, 'Gagal mengunduh PDF')));

  const status = view?.run?.status;
  const editable = status === 'draft';
  const missingBank = view?.items.filter((r) => !r.bankAccount).length ?? 0;
  const zeroBase = view?.items.filter((r) => !r.baseSalary).length ?? 0;

  return (
    <>
      <div className="panel payroll-toolbar">
        <label className="payroll-period">
          <span>Periode</span>
          <input type="month" value={period} max="2100-12" onChange={(e) => e.target.value && setPeriod(e.target.value)} />
        </label>
        <span className={`payroll-status ${status ?? 'none'}`}>
          {status === 'paid'
            ? `Sudah dibayar${view?.run?.paidAt ? ` · ${new Date(view.run.paidAt).toLocaleDateString('id-ID')}` : ''}`
            : status === 'draft'
              ? 'Draft — belum dibayar'
              : 'Belum dibuat (pratinjau)'}
        </span>
        <div className="payroll-actions">
          {status !== 'paid' && (
            <button
              type="button"
              className="btn-outline"
              disabled={busy}
              onClick={() => act(() => payrollApi.generate(period), status ? 'Payroll dihitung ulang' : 'Payroll dibuat')}
            >
              <span aria-hidden="true" className="material-symbols-rounded">calculate</span>
              {status ? 'Hitung ulang' : 'Buat payroll'}
            </button>
          )}
          {view?.run && (
            <button
              type="button"
              className="btn-outline"
              onClick={() => download(payrollApi.recapPdfPath(period), `rekap-gaji-${period}.pdf`)}
            >
              <span aria-hidden="true" className="material-symbols-rounded">picture_as_pdf</span>
              Rekap PDF
            </button>
          )}
          {status === 'draft' && (
            <button type="button" className="btn-primary" disabled={busy} onClick={() => setConfirmPay(true)}>
              <span aria-hidden="true" className="material-symbols-rounded">task_alt</span>
              Tandai sudah dibayar
            </button>
          )}
          {status === 'paid' && (
            <button type="button" className="btn-outline" disabled={busy} onClick={() => setConfirmReopen(true)}>
              Batalkan status dibayar
            </button>
          )}
        </div>
      </div>

      {view && (
        <div className="payroll-stats">
          <div className="payroll-stat main">
            <span>Total ditransfer</span>
            <strong>{rp(view.totals.total)}</strong>
          </div>
          <div className="payroll-stat">
            <span>Gaji pokok + bonus − potongan</span>
            <strong>{rp(view.totals.baseSalary + view.totals.bonus - view.totals.deduction)}</strong>
          </div>
          <div className="payroll-stat">
            <span>Share fee dokter (sudah dipotong lab)</span>
            <strong>{rp(view.totals.shareFee)}</strong>
          </div>
        </div>
      )}

      {view && !view.run && (
        <div className="payroll-note">
          Ini pratinjau hitungan otomatis. Klik <strong>Buat payroll</strong> untuk menyimpan, lalu isi bonus/potongan.
        </div>
      )}
      {(missingBank > 0 || zeroBase > 0) && (
        <div className="payroll-note warn">
          {zeroBase > 0 && <>{zeroBase} pegawai belum punya gaji pokok. </>}
          {missingBank > 0 && <>{missingBank} pegawai belum punya rekening. </>}
          Atur di tab <strong>Data Gaji Pegawai</strong>.
        </div>
      )}

      <div className="panel">
        <div className="fee-table-wrap">
          <table className="fee-table payroll-table">
            <thead>
              <tr>
                <th>Pegawai</th>
                <th>Rekening</th>
                <th>Kehadiran</th>
                <th className="num">Gaji pokok</th>
                <th className="num">Bonus</th>
                <th className="num">Share fee</th>
                <th className="num">Potongan</th>
                <th className="num">Ditransfer</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9}>Memuat…</td>
                </tr>
              ) : !view?.items.length ? (
                <tr>
                  <td colSpan={9}>Belum ada pegawai aktif (admin, dokter, perawat).</td>
                </tr>
              ) : (
                view.items.map((r) => (
                  <tr key={r.userId}>
                    <td>
                      <div className="tarif-name">{r.name}</div>
                      <div className="tarif-kategori">{ROLE_LABEL[r.role] ?? r.role}</div>
                    </td>
                    <td>
                      {r.bankAccount ? (
                        <>
                          <div>
                            {r.bankName} {r.bankAccount}
                          </div>
                          <div className="tarif-kategori">a.n. {r.bankHolder || r.name}</div>
                        </>
                      ) : (
                        <span className="payroll-muted">Belum diisi</span>
                      )}
                    </td>
                    <td className="payroll-muted">
                      {r.attendance
                        ? `${r.attendance.presentDays}/${r.attendance.workDays} hadir · telat ${r.attendance.lateCount}×`
                        : '-'}
                    </td>
                    <td className="num">{rp(r.baseSalary)}</td>
                    <td className="num">
                      {editable ? (
                        <MoneyInput label={`Bonus ${r.name}`} value={r.bonus} disabled={busy} onCommit={(n) => updateRow(r, { bonus: n })} />
                      ) : (
                        rp(r.bonus)
                      )}
                    </td>
                    <td className="num">{r.shareFee ? rp(r.shareFee) : '-'}</td>
                    <td className="num">
                      {editable ? (
                        <>
                          <MoneyInput
                            label={`Potongan ${r.name}`}
                            value={r.deduction}
                            disabled={busy}
                            onCommit={(n) => updateRow(r, { deduction: n })}
                          />
                          <input
                            className="fee-value-input payroll-note-input"
                            placeholder="Keterangan (mis. kasbon)"
                            aria-label={`Keterangan ${r.name}`}
                            defaultValue={r.note ?? ''}
                            maxLength={255}
                            onBlur={(e) => e.target.value !== (r.note ?? '') && updateRow(r, { note: e.target.value })}
                          />
                        </>
                      ) : r.deduction ? (
                        <>
                          ({rp(r.deduction)})
                          {r.note && <div className="tarif-kategori">{r.note}</div>}
                        </>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="num">
                      <strong>{rp(r.total)}</strong>
                    </td>
                    <td>
                      {view.run && (
                        <button
                          type="button"
                          className="btn-row-save"
                          onClick={() => download(payrollApi.slipPdfPath(period, r.userId), `slip-gaji-${period}-${r.name}.pdf`)}
                        >
                          Slip
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {view && view.items.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={3}>Total {view.items.length} pegawai</td>
                  <td className="num">{rp(view.totals.baseSalary)}</td>
                  <td className="num">{rp(view.totals.bonus)}</td>
                  <td className="num">{rp(view.totals.shareFee)}</td>
                  <td className="num">{view.totals.deduction ? `(${rp(view.totals.deduction)})` : '-'}</td>
                  <td className="num">
                    <strong>{rp(view.totals.total)}</strong>
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <p className="payroll-foot">
          Kehadiran hanya informasi, tidak memotong gaji otomatis. Saat ditandai dibayar, gaji pokok + bonus − potongan
          dicatat sebagai pengeluaran &quot;Gaji &amp; Honor&quot;; share fee dokter dihitung terpisah di laporan keuangan.
        </p>
      </div>

      <ConfirmationModal
        isOpen={confirmPay}
        title="Tandai payroll sudah dibayar?"
        message={`Total ${rp(view?.totals.total ?? 0)} untuk ${view?.items.length ?? 0} pegawai. Periode dikunci dan pengeluaran gaji dicatat hari ini.`}
        confirmLabel="Ya, sudah ditransfer"
        onConfirm={() => {
          setConfirmPay(false);
          void act(() => payrollApi.pay(period), 'Payroll ditandai dibayar');
        }}
        onCancel={() => setConfirmPay(false)}
      />
      <ConfirmationModal
        isOpen={confirmReopen}
        title="Batalkan status dibayar?"
        message="Periode bisa diubah lagi dan catatan pengeluaran gaji untuk periode ini dihapus."
        confirmLabel="Batalkan status"
        onConfirm={() => {
          setConfirmReopen(false);
          void act(() => payrollApi.reopen(period), 'Status dibayar dibatalkan');
        }}
        onCancel={() => setConfirmReopen(false)}
      />
    </>
  );
}

function EmployeeRow({ emp, onSaved }: { emp: PayrollEmployee; onSaved: () => void }) {
  const { success, error: showError } = useToast();
  const [form, setForm] = useState({
    baseSalary: String(Math.round(emp.baseSalary || 0)),
    bankName: emp.bankName ?? '',
    bankAccount: emp.bankAccount ?? '',
    bankHolder: emp.bankHolder ?? '',
  });
  const [saving, setSaving] = useState(false);
  const dirty =
    (parseCurrency(form.baseSalary) || 0) !== Math.round(emp.baseSalary || 0) ||
    form.bankName !== (emp.bankName ?? '') ||
    form.bankAccount !== (emp.bankAccount ?? '') ||
    form.bankHolder !== (emp.bankHolder ?? '');

  const save = async () => {
    setSaving(true);
    try {
      await payrollApi.saveEmployee(emp.userId, {
        baseSalary: parseCurrency(form.baseSalary) || 0,
        bankName: form.bankName,
        bankAccount: form.bankAccount,
        bankHolder: form.bankHolder,
      });
      success(`Data gaji ${emp.name} disimpan`);
      onSaved();
    } catch (err) {
      showError(errMsg(err, 'Gagal menyimpan'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr>
      <td>
        <div className="tarif-name">{emp.name}</div>
        <div className="tarif-kategori">
          {ROLE_LABEL[emp.role] ?? emp.role}
          {emp.isDoctor && ' · + share fee'}
        </div>
      </td>
      <td>
        <input
          className="fee-value-input payroll-money"
          inputMode="numeric"
          aria-label={`Gaji pokok ${emp.name}`}
          value={formatCurrencyInput(form.baseSalary)}
          onChange={(e) => setForm({ ...form, baseSalary: e.target.value.replace(/\D/g, '') })}
        />
      </td>
      <td>
        <input
          className="fee-value-input"
          placeholder="BCA"
          aria-label={`Bank ${emp.name}`}
          maxLength={50}
          value={form.bankName}
          onChange={(e) => setForm({ ...form, bankName: e.target.value })}
        />
      </td>
      <td>
        <input
          className="fee-value-input"
          inputMode="numeric"
          placeholder="No. rekening"
          aria-label={`Nomor rekening ${emp.name}`}
          maxLength={50}
          value={form.bankAccount}
          onChange={(e) => setForm({ ...form, bankAccount: e.target.value.replace(/[^0-9 -]/g, '') })}
        />
      </td>
      <td>
        <input
          className="fee-value-input"
          placeholder={emp.name}
          aria-label={`Atas nama ${emp.name}`}
          maxLength={100}
          value={form.bankHolder}
          onChange={(e) => setForm({ ...form, bankHolder: e.target.value })}
        />
      </td>
      <td>
        <button type="button" className="btn-row-save" disabled={!dirty || saving} onClick={save}>
          {saving ? 'Menyimpan…' : 'Simpan'}
        </button>
      </td>
    </tr>
  );
}

function EmployeesTab() {
  const { error: showError } = useToast();
  const [rows, setRows] = useState<PayrollEmployee[] | null>(null);
  const load = useCallback(() => {
    payrollApi
      .employees()
      .then(setRows)
      .catch((err) => showError(errMsg(err, 'Gagal memuat pegawai')));
  }, [showError]);
  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="panel">
      <div className="fee-table-wrap">
        <table className="fee-table payroll-table">
          <thead>
            <tr>
              <th>Pegawai</th>
              <th>Gaji pokok / bulan</th>
              <th>Bank</th>
              <th>No. rekening</th>
              <th>Atas nama</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {!rows ? (
              <tr>
                <td colSpan={6}>Memuat…</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6}>Belum ada pegawai aktif. Tambahkan di Manajemen User.</td>
              </tr>
            ) : (
              rows.map((e) => <EmployeeRow key={`${e.userId}-${e.baseSalary}-${e.bankAccount}`} emp={e} onSaved={load} />)
            )}
          </tbody>
        </table>
      </div>
      <p className="payroll-foot">
        Gaji pokok flat per bulan. Bonus diisi per periode di tab Penggajian Bulanan. Dokter mendapat gaji pokok (boleh Rp 0)
        ditambah share fee tindakan.
      </p>
    </div>
  );
}

export default function PenggajianPage() {
  const [tab, setTab] = useState<Tab>('bulanan');
  const { can } = useFeatures();

  return (
    <DashboardLayout>
      <FeatureGuard feature="payroll">
        <main className="content share-fee-page payroll-page">
          <div className="page-header">
            <div className="page-title-block">
              <div className="page-title">
                <h1>Penggajian</h1>
              </div>
              <p className="page-subtitle">
                Gaji pokok + bonus + share fee dokter per bulan, lengkap dengan rekening, rekap transfer, dan slip gaji.
              </p>
            </div>
          </div>

          <div className="tab-bar">
            <button
              type="button"
              className={`filter-tab ${tab === 'bulanan' ? 'active' : ''}`}
              aria-pressed={tab === 'bulanan'}
              onClick={() => setTab('bulanan')}
            >
              Penggajian Bulanan
            </button>
            <button
              type="button"
              className={`filter-tab ${tab === 'pegawai' ? 'active' : ''}`}
              aria-pressed={tab === 'pegawai'}
              onClick={() => setTab('pegawai')}
            >
              Data Gaji Pegawai
            </button>
          </div>

          {can('payroll') && (tab === 'bulanan' ? <MonthlyTab /> : <EmployeesTab />)}
        </main>
      </FeatureGuard>
    </DashboardLayout>
  );
}
