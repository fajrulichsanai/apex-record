'use client';

import { useState, type FormEvent } from 'react';
import { ApiError } from '@/lib/api-client';
import {
  JENIS_SARANA_OPTIONS,
  saranaApi,
  type SaranaListResponse,
} from '@/lib/master-data';
import { useToast } from '@/lib/toast-context';

const PAGE_SIZE = 10;

/**
 * Pencarian fasilitas di Master Sarana Index (MSI) SATUSEHAT.
 * Dipakai untuk menemukan Kode SATUSEHAT klinik saat setup integrasi.
 */
export default function SaranaSearchCard() {
  const { showToast } = useToast();
  const [nama, setNama] = useState('');
  const [jenis, setJenis] = useState<number>(103);
  const [result, setResult] = useState<SaranaListResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const search = async (page: number) => {
    const keyword = nama.trim();
    const isKode = /^\d{10}$/.test(keyword);
    if (!keyword) {
      showToast('Isi nama atau kode SATUSEHAT sarana', 'error');
      return;
    }
    setLoading(true);
    try {
      const data = await saranaApi.search({
        page,
        limit: PAGE_SIZE,
        jenis_sarana: jenis,
        ...(isKode ? { kode_satusehat: keyword } : { nama: keyword }),
      });
      setResult(data);
    } catch (err) {
      showToast(
        err instanceof ApiError ? err.message : 'Gagal mencari data sarana',
        'error',
      );
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    search(1);
  };

  const copyKode = async (kode: string) => {
    try {
      await navigator.clipboard.writeText(kode);
      showToast(`Kode ${kode} disalin`, 'success');
    } catch {
      showToast('Gagal menyalin kode', 'error');
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        Master Sarana Index (SATUSEHAT)
      </div>

      <div className="info-banner">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        Cari klinik Anda di MSI untuk mengetahui Kode SATUSEHAT-nya.
      </div>

      <div className="card-body">
        <form className="msi-search-form" onSubmit={onSubmit}>
          <select
            className="field-input-real"
            value={jenis}
            onChange={(e) => setJenis(Number(e.target.value))}
          >
            {JENIS_SARANA_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <input
            className="field-input-real"
            value={nama}
            placeholder="Nama sarana atau kode SATUSEHAT (10 digit)"
            onChange={(e) => setNama(e.target.value)}
          />
          <button type="submit" className="main-btn mode-edit" disabled={loading}>
            {loading ? 'Mencari...' : 'Cari'}
          </button>
        </form>

        {result && (
          <>
            {result.items.length === 0 ? (
              <p className="msi-empty">Sarana tidak ditemukan.</p>
            ) : (
              <ul className="msi-list">
                {result.items.map((s) => (
                  <li key={s.kode_satusehat} className="msi-item">
                    <div className="msi-item-main">
                      <strong>{s.nama}</strong>
                      <span>
                        {[s.alamat, s.kabkota?.nama, s.provinsi?.nama]
                          .filter(Boolean)
                          .join(', ')}
                      </span>
                      <span className="msi-meta">
                        Kode SATUSEHAT: <b>{s.kode_satusehat}</b>
                        {s.kode_sarana && <> · Kode sarana: {s.kode_sarana}</>}
                        {s.status_sarana && <> · {s.status_sarana}</>}
                        {s.status_aktif === false && <> · nonaktif</>}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="msi-copy"
                      onClick={() => copyKode(s.kode_satusehat)}
                    >
                      Salin kode
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {result.totalPage > 1 && (
              <div className="msi-pager">
                <button
                  type="button"
                  disabled={loading || result.page <= 1}
                  onClick={() => search(result.page - 1)}
                >
                  ‹ Sebelumnya
                </button>
                <span>
                  Hal {result.page} / {result.totalPage}
                </span>
                <button
                  type="button"
                  disabled={loading || result.page >= result.totalPage}
                  onClick={() => search(result.page + 1)}
                >
                  Berikutnya ›
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
