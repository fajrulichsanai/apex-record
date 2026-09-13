'use client';

import { useEffect, useRef, useState } from 'react';
import type { Map as LeafletMap, LayerGroup } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { reportsApi, PatientOriginPoint, PatientOriginKelurahanPoint } from '@/lib/reports';

const INDONESIA_CENTER: [number, number] = [-2.5, 118];

type Tab = 'kecamatan' | 'kelurahan';

function radiusFor(count: number, maxCount: number) {
  if (maxCount <= 0) return 8;
  const ratio = count / maxCount;
  return 9 + ratio * 22;
}

export default function PatientOriginMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersLayerRef = useRef<LayerGroup | null>(null);
  const markerByKeyRef = useRef<Map<string, import('leaflet').CircleMarker>>(new Map());
  const [points, setPoints] = useState<PatientOriginPoint[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<Tab>('kecamatan');
  const [kelurahanPoints, setKelurahanPoints] = useState<PatientOriginKelurahanPoint[] | null>(null);
  const [kelurahanLoading, setKelurahanLoading] = useState(true);
  const [kelurahanError, setKelurahanError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await reportsApi.getPatientOriginMap();
        if (!cancelled) setPoints(res);
      } catch {
        if (!cancelled) setError('Gagal memuat peta sebaran asal pasien');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setKelurahanLoading(true);
      setKelurahanError(null);
      try {
        const res = await reportsApi.getPatientOriginByKelurahan();
        if (!cancelled) setKelurahanPoints(res);
      } catch {
        if (!cancelled) setKelurahanError('Gagal memuat data per kelurahan');
      } finally {
        if (!cancelled) setKelurahanLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    import('leaflet').then((L) => {
      if (cancelled || !containerRef.current) return;
      if (!mapRef.current) {
        mapRef.current = L.map(containerRef.current, {
          center: INDONESIA_CENTER,
          zoom: 5,
          scrollWheelZoom: false,
        });
        // CartoDB Positron — a plain, muted basemap so the blue patient-density
        // circles are what draws the eye, not a busy general-purpose road map.
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; OpenStreetMap &copy; CARTO',
          maxZoom: 19,
          subdomains: 'abcd',
        }).addTo(mapRef.current);
        markersLayerRef.current = L.layerGroup().addTo(mapRef.current);
      }
    });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!points || !mapRef.current) return;
    let cancelled = false;

    import('leaflet').then((L) => {
      if (cancelled || !mapRef.current || !markersLayerRef.current) return;
      markersLayerRef.current.clearLayers();
      markerByKeyRef.current.clear();

      const resolvedPoints = points.filter((p) => p.resolved && p.lat !== null && p.lng !== null);
      const maxCount = resolvedPoints.reduce((max, p) => Math.max(max, p.count), 0);

      for (const p of resolvedPoints) {
        const key = `${p.kecamatan}|${p.city}`;
        const marker = L.circleMarker([p.lat as number, p.lng as number], {
          radius: radiusFor(p.count, maxCount),
          color: '#FFFFFF',
          weight: 2,
          fillColor: '#4F7EF8',
          fillOpacity: 0.55,
        })
          .bindPopup(
            `<div class="pom-popup"><strong>${p.kecamatan}</strong><span>${p.city}</span><b>${p.count} pasien</b></div>`,
          )
          .on('mouseover', function (this: import('leaflet').CircleMarker) {
            this.setStyle({ fillOpacity: 0.85, weight: 3 });
          })
          .on('mouseout', function (this: import('leaflet').CircleMarker) {
            this.setStyle({ fillOpacity: 0.55, weight: 2 });
          })
          .addTo(markersLayerRef.current!);
        markerByKeyRef.current.set(key, marker);
      }

      if (resolvedPoints.length > 0) {
        const bounds = L.latLngBounds(resolvedPoints.map((p) => [p.lat as number, p.lng as number]));
        mapRef.current.fitBounds(bounds, { padding: [28, 28], maxZoom: 12 });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [points]);

  // Semua kecamatan (yang berhasil dipetakan maupun tidak) digabung jadi satu
  // tabel terurut — sebelumnya kecamatan yang gagal di-geocode cuma disebut
  // dalam satu baris teks panjang di bawah peta, padahal seringkali itu
  // justru mayoritas data (rural/kecamatan kecil jarang dikenali Nominatim).
  const allKecamatanPoints = (points ?? []).slice().sort((a, b) => b.count - a.count);
  const kecamatanTotal = allKecamatanPoints.reduce((sum, p) => sum + p.count, 0);
  const kecamatanMax = allKecamatanPoints.reduce((max, p) => Math.max(max, p.count), 0);
  const unresolvedCount = allKecamatanPoints.filter((p) => !p.resolved).length;

  const sortedKelurahanPoints = (kelurahanPoints ?? []).slice().sort((a, b) => b.count - a.count);
  const kelurahanTotal = sortedKelurahanPoints.reduce((sum, p) => sum + p.count, 0);
  const kelurahanMax = sortedKelurahanPoints.reduce((max, p) => Math.max(max, p.count), 0);

  const focusPoint = (p: PatientOriginPoint) => {
    if (!p.resolved) return;
    const key = `${p.kecamatan}|${p.city}`;
    setActiveKey(key);
    const marker = markerByKeyRef.current.get(key);
    if (marker && mapRef.current) {
      mapRef.current.flyTo(marker.getLatLng(), Math.max(mapRef.current.getZoom(), 12), { duration: 0.5 });
      marker.openPopup();
    }
  };

  return (
    <div className="panel chart-panel wide">
      <div className="panel-header">
        <h2>Peta Sebaran Asal Pasien</h2>
        <span className="heatmap-busiest">Berdasarkan kecamatan &amp; kota, seluruh riwayat klinik</span>
      </div>
      {error && <div className="empty-list"><div className="empty-title">{error}</div></div>}
      <div ref={containerRef} className="patient-origin-map" />
      {loading && <div className="patient-origin-map-loading">Memuat titik lokasi...</div>}
      {!loading && points && points.length === 0 && (
        <div className="empty-list"><div className="empty-title">Belum ada data alamat pasien</div></div>
      )}

      <div className="range-tabs pom-tabs">
        <button
          type="button"
          className={`range-tab ${activeTab === 'kecamatan' ? 'active' : ''}`}
          onClick={() => setActiveTab('kecamatan')}
        >
          Per Kecamatan
        </button>
        <button
          type="button"
          className={`range-tab ${activeTab === 'kelurahan' ? 'active' : ''}`}
          onClick={() => setActiveTab('kelurahan')}
        >
          Per Kelurahan
        </button>
      </div>

      {activeTab === 'kecamatan' && !loading && allKecamatanPoints.length > 0 && (
        <div className="laporan-table-wrap patient-origin-table-wrap">
          <table className="laporan-table">
            <thead>
              <tr>
                <th>Kecamatan</th>
                <th>Kota</th>
                <th className="pom-num">Pasien</th>
                <th className="pom-bar-col"></th>
              </tr>
            </thead>
            <tbody>
              {allKecamatanPoints.map((p) => {
                const key = `${p.kecamatan}|${p.city}`;
                const percent = kecamatanTotal > 0 ? Math.round((p.count / kecamatanTotal) * 100) : 0;
                const barPercent = kecamatanMax > 0 ? Math.round((p.count / kecamatanMax) * 100) : 0;
                return (
                  <tr
                    key={key}
                    className={activeKey === key ? 'active' : ''}
                    onClick={() => focusPoint(p)}
                    style={{ cursor: p.resolved ? 'pointer' : 'default' }}
                  >
                    <td className="pom-kecamatan">
                      {p.kecamatan}
                      {!p.resolved && (
                        <span className="pom-unmapped-badge" title="Nama lokasi tidak dikenali layanan peta">
                          belum di peta
                        </span>
                      )}
                    </td>
                    <td>{p.city}</td>
                    <td className="pom-num">
                      {p.count} <span className="pom-percent">({percent}%)</span>
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

      {activeTab === 'kecamatan' && !loading && unresolvedCount > 0 && (
        <div className="patient-origin-map-note">
          {unresolvedCount} dari {allKecamatanPoints.length} kecamatan belum berhasil dipetakan ke peta (ditandai
          &quot;belum di peta&quot; di atas) — nama lokasinya tidak dikenali layanan peta, tapi jumlah pasiennya
          tetap dihitung di tabel.
        </div>
      )}

      {activeTab === 'kelurahan' && (
        <>
          {kelurahanError && (
            <div className="empty-list"><div className="empty-title">{kelurahanError}</div></div>
          )}
          {kelurahanLoading && <div className="patient-origin-map-loading">Memuat data per kelurahan...</div>}
          {!kelurahanLoading && sortedKelurahanPoints.length === 0 && !kelurahanError && (
            <div className="empty-list"><div className="empty-title">Belum ada data kelurahan pasien</div></div>
          )}
          {!kelurahanLoading && sortedKelurahanPoints.length > 0 && (
            <div className="laporan-table-wrap patient-origin-table-wrap">
              <table className="laporan-table">
                <thead>
                  <tr>
                    <th>Kelurahan</th>
                    <th>Kecamatan</th>
                    <th>Kota</th>
                    <th className="pom-num">Pasien</th>
                    <th className="pom-bar-col"></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedKelurahanPoints.map((p, i) => {
                    const percent = kelurahanTotal > 0 ? Math.round((p.count / kelurahanTotal) * 100) : 0;
                    const barPercent = kelurahanMax > 0 ? Math.round((p.count / kelurahanMax) * 100) : 0;
                    return (
                      <tr key={`${p.kelurahan}|${p.kecamatan}|${p.city}|${i}`}>
                        <td className="pom-kecamatan">{p.kelurahan}</td>
                        <td>{p.kecamatan || '—'}</td>
                        <td>{p.city || '—'}</td>
                        <td className="pom-num">
                          {p.count} <span className="pom-percent">({percent}%)</span>
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
        </>
      )}
    </div>
  );
}
