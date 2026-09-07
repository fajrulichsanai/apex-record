'use client';

import { useEffect, useRef, useState } from 'react';
import type { Map as LeafletMap, LayerGroup } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { reportsApi, PatientOriginPoint } from '@/lib/reports';

const INDONESIA_CENTER: [number, number] = [-2.5, 118];

function radiusFor(count: number, maxCount: number) {
  if (maxCount <= 0) return 8;
  const ratio = count / maxCount;
  return 8 + ratio * 28;
}

export default function PatientOriginMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersLayerRef = useRef<LayerGroup | null>(null);
  const [points, setPoints] = useState<PatientOriginPoint[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 18,
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

      const resolvedPoints = points.filter((p) => p.resolved && p.lat !== null && p.lng !== null);
      const maxCount = resolvedPoints.reduce((max, p) => Math.max(max, p.count), 0);

      for (const p of resolvedPoints) {
        L.circleMarker([p.lat as number, p.lng as number], {
          radius: radiusFor(p.count, maxCount),
          color: '#4F7EF8',
          weight: 1,
          fillColor: '#4F7EF8',
          fillOpacity: 0.45,
        })
          .bindTooltip(`${p.kecamatan}, ${p.city}<br/>${p.count} pasien`)
          .addTo(markersLayerRef.current);
      }

      if (resolvedPoints.length > 0) {
        const bounds = L.latLngBounds(resolvedPoints.map((p) => [p.lat as number, p.lng as number]));
        mapRef.current.fitBounds(bounds, { padding: [24, 24], maxZoom: 11 });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [points]);

  const unresolvedCount = points ? points.filter((p) => !p.resolved).length : 0;

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
      {!loading && unresolvedCount > 0 && (
        <div className="patient-origin-map-note">
          {unresolvedCount} kecamatan belum berhasil dipetakan (nama lokasi tidak dikenali layanan peta)
        </div>
      )}
    </div>
  );
}
