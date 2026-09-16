'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FeatureGuard from '@/components/auth/FeatureGuard';
import OdontogramChart from '@/components/odontogram/OdontogramChart';
import ToothDetailPanel from '@/components/odontogram/ToothDetailPanel';
import IndexSummary from '@/components/odontogram/IndexSummary';
import { computeIndices } from '@/components/odontogram/odontogram-data';
import { odontogramApi, SurfaceCondition, ToothData, ToothStatusBelow } from '@/lib/odontogram';
import { encounterApi, EncounterDetail } from '@/lib/encounter';
import { ApiError } from '@/lib/api-client';
import '../../styles/odontogram.css';

const LEGEND_ITEMS: { swatch?: string; symbol?: string; label: string }[] = [
  { swatch: '#1A2340', label: 'Karies' },
  { swatch: '#2DCB8A', label: 'Komposit' },
  { swatch: '#EC4899', label: 'GIC' },
  { symbol: '✕', label: 'Missing' },
  { symbol: '#', label: 'CFR (Crown Fracture)' },
  { symbol: '✓', label: 'RRX (Root Extraction)' },
  { symbol: '▽', label: 'RCT (Root Canal Treatment)' },
];

export default function OdontogramPage() {
  return (
    <Suspense fallback={null}>
      <OdontogramPageInner />
    </Suspense>
  );
}

function OdontogramPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const encounterId = Number(searchParams.get('encounterId')) || null;

  const [encounter, setEncounter] = useState<EncounterDetail | null>(null);
  const [teeth, setTeeth] = useState<Record<string, ToothData>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [showLegend, setShowLegend] = useState(false);

  const load = useCallback(async () => {
    if (!encounterId) {
      setLoadError('encounterId tidak ditemukan pada URL');
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const [data, enc] = await Promise.all([
        odontogramApi.get(encounterId),
        encounterApi.detail(encounterId).catch(() => null),
      ]);
      setTeeth(data?.teeth || {});
      setEncounter(enc);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Gagal memuat data odontogram');
    } finally {
      setLoading(false);
    }
  }, [encounterId]);

  useEffect(() => {
    load();
  }, [load]);

  const updateTooth = (id: string, patch: Partial<ToothData>) => {
    setTeeth((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch },
    }));
  };

  const handleSurfaceChange = (
    surface: keyof NonNullable<ToothData['surfaces']>,
    value: SurfaceCondition,
  ) => {
    if (!selected) return;
    const current = teeth[selected] || {};
    updateTooth(selected, { surfaces: { ...current.surfaces, [surface]: value } });
  };

  const handleStatusBelowChange = (value: ToothStatusBelow) => {
    if (!selected) return;
    updateTooth(selected, { statusBelow: value });
  };

  const handleRCTChange = (value: boolean) => {
    if (!selected) return;
    updateTooth(selected, { isRCT: value });
  };

  const handleReset = () => {
    if (!confirm('Reset seluruh data odontogram pada kunjungan ini?')) return;
    setTeeth({});
    setSelected(null);
  };

  const handleSave = async () => {
    if (!encounterId) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      await odontogramApi.upsert(encounterId, { teeth });
      setSaveMessage('Odontogram berhasil disimpan');
    } catch (err) {
      setSaveMessage(err instanceof ApiError ? err.message : 'Gagal menyimpan odontogram');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const { dmft, deft } = computeIndices(teeth);
  const selectedData = selected ? teeth[selected] || {} : null;

  return (
    <DashboardLayout>
      <FeatureGuard feature="kunjungan">
        <main className="content odontogram-page">
          <div className="page-header">
            <button type="button" className="back-btn" onClick={() => router.back()}>
              <span className="material-symbols-rounded">arrow_back</span>
            </button>
            <div className="page-title-block">
              <h1>Odontogram</h1>
              <p className="page-subtitle">
                {encounter?.patient?.name ? `${encounter.patient.name} · ` : ''}
                Kelola kondisi gigi pasien untuk kunjungan ini
              </p>
            </div>
            <div className="header-actions">
              {saveMessage && (
                <span style={{ fontSize: 12.5, color: '#6B7A99', marginRight: 4 }}>{saveMessage}</span>
              )}
              <button
                type="button"
                className="icon-btn"
                title="Legenda"
                onClick={() => setShowLegend((v) => !v)}
              >
                <span className="material-symbols-rounded">help_outline</span>
              </button>
              <button type="button" className="icon-btn" title="Reset" onClick={handleReset}>
                <span className="material-symbols-rounded">refresh</span>
              </button>
              <button type="button" className="btn-primary" onClick={handleSave} disabled={saving || !encounterId}>
                <span className="material-symbols-rounded" style={{ fontSize: 18 }}>
                  save
                </span>
                {saving ? 'Menyimpan…' : 'Simpan'}
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#6B7A99' }}>Memuat odontogram…</div>
          ) : loadError ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#FF4D4F' }}>{loadError}</div>
          ) : (
            <div className="odontogram-body">
              <div className="odontogram-main">
                {showLegend && (
                  <div className="odontogram-legend">
                    {LEGEND_ITEMS.map((item) => (
                      <div className="odontogram-legend-item" key={item.label}>
                        {item.swatch ? (
                          <span className="odontogram-legend-swatch" style={{ background: item.swatch }} />
                        ) : (
                          <span className="odontogram-legend-symbol">{item.symbol}</span>
                        )}
                        {item.label}
                      </div>
                    ))}
                  </div>
                )}

                <OdontogramChart teeth={teeth} selected={selected} onSelect={setSelected} />

                <IndexSummary dmft={dmft} deft={deft} />
              </div>

              {selectedData && selected ? (
                <ToothDetailPanel
                  toothId={selected}
                  data={selectedData}
                  onSurfaceChange={handleSurfaceChange}
                  onStatusBelowChange={handleStatusBelowChange}
                  onRCTChange={handleRCTChange}
                  onClose={() => setSelected(null)}
                />
              ) : (
                <div className="odontogram-empty-detail">
                  <span className="material-symbols-rounded">touch_app</span>
                  <div className="odontogram-empty-detail-title">Belum ada gigi dipilih</div>
                  <div className="odontogram-empty-detail-sub">
                    Klik salah satu gigi pada bagan untuk mengisi kondisinya
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </FeatureGuard>
    </DashboardLayout>
  );
}
