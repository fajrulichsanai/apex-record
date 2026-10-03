'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Pager, SatusehatShell } from '@/components/satusehat/SatusehatShell';
import {
  JENIS_SARANA_OPTIONS,
  masterDataApi,
  saranaApi,
  type SaranaListResponse,
  type SearchSaranaQuery,
  type WilayahItem,
} from '@/lib/master-data';
import { useToast } from '@/lib/toast-context';

const PAGE_SIZE = 20;

const STATUS_SARANA = ['draft', 'verified', 'valid', 'reverified'] as const;

export default function SaranaPage() {
  const { showToast } = useToast();
  const [keyword, setKeyword] = useState('');
  const [jenis, setJenis] = useState<number | ''>(103);
  const [provinsi, setProvinsi] = useState('');
  const [statusSarana, setStatusSarana] = useState<SearchSaranaQuery['status_sarana'] | ''>('');
  const [provinces, setProvinces] = useState<WilayahItem[]>([]);
  const [result, setResult] = useState<SaranaListResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    masterDataApi
      .getProvinces()
      .then(setProvinces)
      .catch(() => setProvinces([]));
  }, []);

  async function search(page: number) {
    const kw = keyword.trim();
    const isKode = /^\d{10}$/.test(kw);
    setLoading(true);
    try {
      const data = await saranaApi.search({
        page,
        limit: PAGE_SIZE,
        jenis_sarana: jenis || undefined,
        kode_provinsi: provinsi || undefined,
        status_sarana: statusSarana || undefined,
        ...(kw ? (isKode ? { kode_satusehat: kw } : { nama: kw }) : {}),
      });
      setResult(data);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal mencari data sarana', 'error');
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void search(1);
  }

  async function copyKode(kode: string) {
    try {
      await navigator.clipboard.writeText(kode);
      showToast(`Kode ${kode} disalin`, 'success');
    } catch {
      showToast('Gagal menyalin kode', 'error');
    }
  }

  return (
    <SatusehatShell
      title="Master Sarana Index (MSI)"
      subtitle="Cari fasilitas kesehatan yang terdaftar di SATUSEHAT: rumah sakit, klinik, puskesmas, praktik mandiri"
    >
      <div className="ss-card">
        <form className="ss-toolbar" onSubmit={onSubmit}>
          <select className="ss-input" value={jenis} onChange={(e) => setJenis(e.target.value ? Number(e.target.value) : '')}>
            <option value="">Semua jenis</option>
            {JENIS_SARANA_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select className="ss-input" value={provinsi} onChange={(e) => setProvinsi(e.target.value)}>
            <option value="">Semua provinsi</option>
            {provinces.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            className="ss-input"
            value={statusSarana}
            onChange={(e) => setStatusSarana(e.target.value as SearchSaranaQuery['status_sarana'] | '')}
          >
            <option value="">Semua status sarana</option>
            {STATUS_SARANA.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input
            className="ss-input grow"
            value={keyword}
            placeholder="Nama sarana atau kode SATUSEHAT (10 digit)"
            onChange={(e) => setKeyword(e.target.value)}
          />
          <button type="submit" className="ss-btn primary" disabled={loading}>
            {loading ? 'Mencari...' : 'Cari'}
          </button>
        </form>

        {!result ? (
          <div className="ss-empty">Pilih filter lalu tekan Cari.</div>
        ) : result.items.length === 0 ? (
          <div className="ss-empty">Sarana tidak ditemukan.</div>
        ) : (
          <div className="ss-table-wrap">
            <table className="ss-table">
              <thead>
                <tr>
                  <th>Sarana</th>
                  <th>Kode SATUSEHAT</th>
                  <th>Jenis / Kelas</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {result.items.map((s) => (
                  <tr key={s.kode_satusehat}>
                    <td>
                      <strong>{s.nama}</strong>
                      <span className="sub">
                        {[s.alamat, s.kabkota?.nama, s.provinsi?.nama].filter(Boolean).join(', ') || '-'}
                      </span>
                      {(s.telp || s.email) && (
                        <span className="sub">{[s.telp, s.email].filter(Boolean).join(' · ')}</span>
                      )}
                    </td>
                    <td className="ss-mono">
                      {s.kode_satusehat}
                      {s.kode_sarana && <span className="sub">Kode sarana: {s.kode_sarana}</span>}
                    </td>
                    <td>
                      {s.jenis_sarana?.nama ?? '-'}
                      {s.subjenis?.nama && <span className="sub">{s.subjenis.nama}</span>}
                      {s.kelas_sarana?.nama && <span className="sub">Kelas {s.kelas_sarana.nama}</span>}
                    </td>
                    <td>
                      {s.status_sarana && (
                        <span
                          className={`ss-badge ${s.status_sarana === 'valid' || s.status_sarana === 'verified' ? 'synced' : 'pending'}`}
                        >
                          {s.status_sarana}
                        </span>
                      )}
                      {s.status_aktif === false && (
                        <span className="sub">
                          <span className="ss-badge failed">nonaktif</span>
                        </span>
                      )}
                    </td>
                    <td>
                      <button type="button" className="ss-btn sm" onClick={() => copyKode(s.kode_satusehat)}>
                        Salin kode
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {result && result.totalPage > 1 && (
          <Pager page={result.page} totalPages={result.totalPage} loading={loading} onChange={(p) => void search(p)} />
        )}
      </div>
    </SatusehatShell>
  );
}
