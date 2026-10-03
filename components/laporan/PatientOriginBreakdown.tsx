'use client';

import { useEffect, useMemo, useState } from 'react';
import { reportsApi, PatientOriginKelurahan, PatientOriginPoint } from '@/lib/reports';

type Level = 'kota' | 'kecamatan' | 'kelurahan';

interface Row {
  key: string;
  name: string;
  /** Wilayah induk, mis. "Kec. X, Kota Y" untuk kelurahan. */
  parent: string | null;
  count: number;
}

const LEVELS: { value: Level; label: string; column: string }[] = [
  { value: 'kota', label: 'Kabupaten/Kota', column: 'Kabupaten/Kota' },
  { value: 'kecamatan', label: 'Kecamatan', column: 'Kecamatan' },
  { value: 'kelurahan', label: 'Kelurahan', column: 'Kelurahan/Desa' },
];

/**
 * Sebaran asal pasien per wilayah administratif (tanpa peta). Kota & kecamatan
 * dari agregasi kecamatan+kota, kelurahan dari endpoint kelurahan — pasien yang
 * belum mengisi kelurahan hanya ikut terhitung di dua level pertama.
 */
export default function PatientOriginBreakdown() {
  const [kecamatanRows, setKecamatanRows] = useState<PatientOriginPoint[] | null>(null);
  const [kelurahanRows, setKelurahanRows] = useState<PatientOriginKelurahan[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState<Level>('kota');

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      reportsApi.getPatientOriginMap(),
      reportsApi.getPatientOriginByKelurahan().catch(() => [] as PatientOriginKelurahan[]),
    ])
      .then(([kec, kel]) => {
        if (cancelled) return;
        setKecamatanRows(kec);
        setKelurahanRows(kel);
      })
      .catch(() => {
        if (!cancelled) setError('Gagal memuat sebaran asal pasien');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loading = !error && (kecamatanRows === null || kelurahanRows === null);

  const rowsByLevel = useMemo<Record<Level, Row[]>>(() => {
    const kec = kecamatanRows ?? [];
    const kel = kelurahanRows ?? [];

    const kotaMap = new Map<string, number>();
    for (const r of kec) kotaMap.set(r.city, (kotaMap.get(r.city) ?? 0) + r.count);

    const byCount = (a: Row, b: Row) => b.count - a.count || a.name.localeCompare(b.name);

    return {
      kota: [...kotaMap.entries()].map(([city, count]) => ({ key: city, name: city, parent: null, count })).sort(byCount),
      kecamatan: kec
        .map((r) => ({ key: `${r.kecamatan}|${r.city}`, name: r.kecamatan, parent: r.city, count: r.count }))
        .sort(byCount),
      kelurahan: kel
        .map((r) => ({
          key: `${r.kelurahan}|${r.kecamatan ?? ''}|${r.city ?? ''}`,
          name: r.kelurahan,
          parent: [r.kecamatan && `Kec. ${r.kecamatan}`, r.city].filter(Boolean).join(', ') || null,
          count: r.count,
        }))
        .sort(byCount),
    };
  }, [kecamatanRows, kelurahanRows]);

  const rows = rowsByLevel[level];
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  const max = rows.reduce((m, r) => Math.max(m, r.count), 0);
  const totalWithKecamatan = rowsByLevel.kecamatan.reduce((sum, r) => sum + r.count, 0);
  const missingKelurahan = Math.max(0, totalWithKecamatan - rowsByLevel.kelurahan.reduce((s, r) => s + r.count, 0));
  const column = LEVELS.find((l) => l.value === level)!.column;

  return (
    <div className="panel chart-panel wide">
      <div className="panel-header">
        <div>
          <h2>Sebaran Asal Pasien</h2>
          <span className="origin-subtitle">Berdasarkan alamat pasien, seluruh riwayat klinik</span>
        </div>
        <div className="range-tabs" role="tablist" aria-label="Level wilayah">
          {LEVELS.map((l) => (
            <button
              key={l.value}
              type="button"
              role="tab"
              aria-selected={level === l.value}
              className={`range-tab ${level === l.value ? 'active' : ''}`}
              onClick={() => setLevel(l.value)}
            >
              {l.label}
              {!loading && <span className="origin-tab-count">{rowsByLevel[l.value].length}</span>}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="empty-list"><div className="empty-title">{error}</div></div>
      ) : loading ? (
        <div className="patient-origin-map-loading">Memuat sebaran asal pasien...</div>
      ) : rows.length === 0 ? (
        <div className="empty-list">
          <div className="empty-title">
            {level === 'kelurahan' ? 'Belum ada pasien dengan data kelurahan' : 'Belum ada data alamat pasien'}
          </div>
        </div>
      ) : (
        <div className="laporan-table-wrap patient-origin-table-wrap">
          <table className="laporan-table">
            <thead>
              <tr>
                <th className="pom-rank">#</th>
                <th>{column}</th>
                <th className="pom-num">Pasien</th>
                <th className="pom-bar-col" aria-label="Proporsi"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const percent = total > 0 ? Math.round((r.count / total) * 100) : 0;
                const barPercent = max > 0 ? Math.round((r.count / max) * 100) : 0;
                return (
                  <tr key={r.key}>
                    <td className="pom-rank">{i + 1}</td>
                    <td>
                      <div className="pom-kecamatan">{r.name}</div>
                      {r.parent && <div className="pom-parent">{r.parent}</div>}
                    </td>
                    <td className="pom-num">
                      {r.count} <span className="pom-percent">({percent}%)</span>
                    </td>
                    <td className="pom-bar-col">
                      <div className="pom-bar-track">
                        <div className="pom-bar-fill" style={{ width: `${barPercent}%` }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && level === 'kelurahan' && missingKelurahan > 0 && (
        <div className="patient-origin-map-note">
          {missingKelurahan} pasien belum mengisi kelurahan di data alamatnya, jadi hanya terhitung di level kota &amp; kecamatan.
        </div>
      )}
    </div>
  );
}
