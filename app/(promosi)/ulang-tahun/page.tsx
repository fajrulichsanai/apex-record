'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { FiGift, FiDownload } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FeatureGuard from '@/components/auth/FeatureGuard';
import { ApiError } from '@/lib/api-client';
import { clinicApi } from '@/lib/clinic';
import { patientsApi, type BirthdayPatient } from '@/lib/patients';
import { useToast } from '@/lib/toast-context';
import { waLink } from '@/lib/utils/whatsapp';
import '../../styles/laporan.css';
import '../../styles/ulang-tahun.css';

type Range = 'today' | 'week' | 'month';

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const DEFAULT_MESSAGE =
  'Halo {nama}, selamat ulang tahun ke-{usia}! 🎉 Semoga sehat selalu. Sebagai hadiah, {klinik} memberikan promo spesial ulang tahun untuk Anda bulan ini. Balas pesan ini untuk reservasi ya.';
const MESSAGE_KEY = 'apex.ulangTahun.message';

const tanggal = (iso: string) => {
  const [, m, d] = iso.split('-').map(Number);
  return `${d} ${BULAN[m - 1]}`;
};

function fill(template: string, p: BirthdayPatient, klinik: string) {
  return template
    .replace(/\{nama\}/g, p.name)
    .replace(/\{usia\}/g, String(p.turning))
    .replace(/\{klinik\}/g, klinik || 'klinik kami');
}

function exportCsv(rows: BirthdayPatient[], label: string) {
  const esc = (v: string | number | null) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [
    ['No. RM', 'Nama', 'Tanggal lahir', 'Ulang tahun ke-', 'No. HP', 'Kunjungan terakhir', 'Setuju promosi'].map(esc).join(','),
    ...rows.map((r) =>
      [r.noRm, r.name, r.birthDate, r.turning, r.phone, r.lastVisit ? r.lastVisit.slice(0, 10) : '', r.consentMarketing ? 'Ya' : 'Tidak']
        .map(esc)
        .join(','),
    ),
  ];
  const blob = new Blob([`﻿${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ulang-tahun-${label}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function UlangTahunPage() {
  const { error: showError } = useToast();
  const [range, setRange] = useState<Range>('week');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [rows, setRows] = useState<BirthdayPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlyConsent, setOnlyConsent] = useState(false);
  const [klinik, setKlinik] = useState('');
  const [message, setMessage] = useState(DEFAULT_MESSAGE);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(MESSAGE_KEY);
      if (saved) setMessage(saved);
    } catch {
      /* storage tidak tersedia — pakai pesan bawaan */
    }
    clinicApi
      .get()
      .then((c) => setKlinik(c.name))
      .catch(() => undefined);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await patientsApi.birthdays(range, range === 'month' ? month : undefined));
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Gagal memuat data ulang tahun');
    } finally {
      setLoading(false);
    }
  }, [range, month, showError]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveMessage = (v: string) => {
    setMessage(v);
    try {
      window.localStorage.setItem(MESSAGE_KEY, v);
    } catch {
      /* abaikan */
    }
  };

  const shown = useMemo(() => (onlyConsent ? rows.filter((r) => r.consentMarketing) : rows), [rows, onlyConsent]);
  const consentCount = rows.filter((r) => r.consentMarketing).length;
  const label = range === 'month' ? BULAN[month - 1] : range === 'today' ? 'hari ini' : '7 hari ke depan';

  return (
    <DashboardLayout>
      <FeatureGuard feature="ulang-tahun">
        <main className="content laporan-page ulang-tahun-page">
          <div className="page-header">
            <div className="page-title-block">
              <div className="page-title">
                <h1>Ulang Tahun Pasien</h1>
              </div>
              <p className="page-subtitle">
                Daftar pasien yang berulang tahun untuk promo & ucapan. Kirim promo hanya ke pasien yang setuju menerima
                informasi promosi.
              </p>
            </div>
          </div>

          <div className="panel ut-toolbar">
            <div className="range-tabs" role="tablist" aria-label="Rentang">
              {(
                [
                  ['today', 'Hari ini'],
                  ['week', '7 hari ke depan'],
                  ['month', 'Per bulan'],
                ] as [Range, string][]
              ).map(([k, l]) => (
                <button
                  key={k}
                  type="button"
                  role="tab"
                  aria-selected={range === k}
                  className={`range-tab ${range === k ? 'active' : ''}`}
                  onClick={() => setRange(k)}
                >
                  {l}
                </button>
              ))}
            </div>
            {range === 'month' && (
              <select className="ut-select" aria-label="Bulan" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                {BULAN.map((b, i) => (
                  <option key={b} value={i + 1}>
                    {b}
                  </option>
                ))}
              </select>
            )}
            <label className="ut-check">
              <input type="checkbox" checked={onlyConsent} onChange={(e) => setOnlyConsent(e.target.checked)} />
              Hanya yang setuju promosi
            </label>
            <button
              type="button"
              className="range-tab ut-export"
              disabled={!shown.length}
              onClick={() => exportCsv(shown, label.replace(/\s+/g, '-').toLowerCase())}
            >
              <FiDownload /> Ekspor CSV
            </button>
          </div>

          <div className="ut-summary">
            <div className="ut-stat">
              <FiGift />
              <div>
                <strong>{loading ? '…' : rows.length}</strong>
                <span>pasien berulang tahun {label}</span>
              </div>
            </div>
            <div className="ut-stat">
              <FaWhatsapp />
              <div>
                <strong>{loading ? '…' : consentCount}</strong>
                <span>setuju menerima promosi</span>
              </div>
            </div>
          </div>

          <div className="panel ut-message">
            <label htmlFor="ut-msg">Pesan WhatsApp</label>
            <textarea id="ut-msg" rows={3} value={message} maxLength={600} onChange={(e) => saveMessage(e.target.value)} />
            <div className="ut-message-foot">
              <span>
                Kata ganti: <code>{'{nama}'}</code> <code>{'{usia}'}</code> <code>{'{klinik}'}</code>
              </span>
              {message !== DEFAULT_MESSAGE && (
                <button type="button" className="ut-link" onClick={() => saveMessage(DEFAULT_MESSAGE)}>
                  Kembalikan pesan bawaan
                </button>
              )}
            </div>
          </div>

          <div className="panel laporan-table-panel">
            <div className="laporan-table-wrap">
              <table className="laporan-table">
                <thead>
                  <tr>
                    <th>Pasien</th>
                    <th>Ulang tahun</th>
                    <th>Usia</th>
                    <th>No. HP</th>
                    <th>Kunjungan terakhir</th>
                    <th>Promosi</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7}>Memuat…</td>
                    </tr>
                  ) : shown.length === 0 ? (
                    <tr>
                      <td colSpan={7}>Tidak ada pasien yang berulang tahun {label}.</td>
                    </tr>
                  ) : (
                    shown.map((p) => (
                      <tr key={p.id} className={p.isToday ? 'ut-today' : undefined}>
                        <td>
                          <Link href={`/list-pasien/${p.id}/rekam-medis`} className="ut-name">
                            {p.name}
                          </Link>
                          <div className="ut-sub">{p.noRm}</div>
                        </td>
                        <td>
                          {tanggal(p.birthDate)}
                          {p.isToday && <span className="ut-badge">Hari ini</span>}
                        </td>
                        <td>{p.turning} th</td>
                        <td>{p.phone || '-'}</td>
                        <td>{p.lastVisit ? new Date(p.lastVisit).toLocaleDateString('id-ID') : 'Belum pernah'}</td>
                        <td>
                          <span className={`ut-consent ${p.consentMarketing ? 'yes' : 'no'}`}>
                            {p.consentMarketing ? 'Setuju' : 'Belum setuju'}
                          </span>
                        </td>
                        <td>
                          {p.phone && p.consentMarketing ? (
                            <a className="ut-wa" href={waLink(p.phone, fill(message, p, klinik))} target="_blank" rel="noopener noreferrer">
                              <FaWhatsapp /> Kirim
                            </a>
                          ) : (
                            <span className="ut-sub" title="Pasien belum memberi izin promosi atau tidak punya nomor HP">
                              {p.phone ? 'Butuh izin promosi' : 'Tanpa nomor'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </FeatureGuard>
    </DashboardLayout>
  );
}
