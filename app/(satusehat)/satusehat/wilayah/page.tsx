'use client';

import { useEffect, useMemo, useState } from 'react';
import { SatusehatShell } from '@/components/satusehat/SatusehatShell';
import { masterDataApi, type WilayahItem } from '@/lib/master-data';
import { useToast } from '@/lib/toast-context';

const LEVELS = ['Provinsi', 'Kabupaten/Kota', 'Kecamatan', 'Kelurahan/Desa'] as const;

function fetchLevel(depth: number, parentCode?: string) {
  switch (depth) {
    case 0:
      return masterDataApi.getProvinces();
    case 1:
      return masterDataApi.getCities(parentCode!);
    case 2:
      return masterDataApi.getDistricts(parentCode!);
    default:
      return masterDataApi.getSubDistricts(parentCode!);
  }
}

export default function WilayahPage() {
  const { showToast } = useToast();
  /** Jejak wilayah yang dipilih; panjangnya = kedalaman level yang sedang ditampilkan. */
  const [trail, setTrail] = useState<WilayahItem[]>([]);
  const [items, setItems] = useState<WilayahItem[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const depth = trail.length;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchLevel(depth, trail[depth - 1]?.code)
      .then((data) => {
        if (!cancelled) setItems(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!cancelled) {
          setItems([]);
          showToast(err instanceof Error ? err.message : 'Gagal memuat data wilayah', 'error');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [depth, trail, showToast]);

  const filtered = useMemo(() => {
    const f = filter.trim().toLowerCase();
    if (!f) return items;
    return items.filter((i) => i.name.toLowerCase().includes(f) || i.code.includes(f));
  }, [items, filter]);

  function drill(item: WilayahItem) {
    if (depth >= LEVELS.length - 1) return;
    setFilter('');
    setTrail([...trail, item]);
  }

  function goTo(level: number) {
    setFilter('');
    setTrail(trail.slice(0, level));
  }

  return (
    <SatusehatShell
      title="Master Wilayah"
      subtitle="Kode wilayah resmi SATUSEHAT (dipakai untuk alamat pasien & klinik)"
    >
      <div className="ss-card">
        <div className="ss-toolbar" style={{ fontSize: 13 }}>
          <button type="button" className="ss-btn sm" onClick={() => goTo(0)} disabled={depth === 0}>
            Indonesia
          </button>
          {trail.map((t, i) => (
            <span key={t.code} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              ›
              <button type="button" className="ss-btn sm" onClick={() => goTo(i + 1)} disabled={i === depth - 1}>
                {t.name}
              </button>
            </span>
          ))}
        </div>

        <div className="ss-toolbar">
          <input
            className="ss-input grow"
            placeholder={`Filter ${LEVELS[depth].toLowerCase()} (nama atau kode)`}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <span className="ss-muted">{filtered.length} data</span>
        </div>

        <div className="ss-table-wrap">
          <table className="ss-table">
            <thead>
              <tr>
                <th>{LEVELS[depth]}</th>
                <th>Kode</th>
                <th>Kode BPS</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="ss-empty">
                    Memuat...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="ss-empty">
                    Tidak ada data.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.code}>
                    <td>{item.name}</td>
                    <td className="ss-mono">{item.code}</td>
                    <td className="ss-mono">{item.bps_code || '-'}</td>
                    <td>
                      {depth < LEVELS.length - 1 && (
                        <button type="button" className="ss-btn sm" onClick={() => drill(item)}>
                          Lihat {LEVELS[depth + 1]} ›
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </SatusehatShell>
  );
}
