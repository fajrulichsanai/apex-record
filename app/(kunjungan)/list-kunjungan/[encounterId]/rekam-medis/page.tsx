'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FeatureGuard from '@/components/auth/FeatureGuard';
import SignaturePad from '@/components/form/SignaturePad';
import { encounterApi, EncounterDetail } from '@/lib/encounter';
import { encounterSoapApi } from '@/lib/encounter-soap';
import { ApiError } from '@/lib/api-client';
import { useToast } from '@/lib/toast-context';
import '../../../../styles/kunjungan.css';
import '../../../../styles/rekam-medis.css';

// Rekam Medis is a book: one chapter per kind of clinical record. Only SOAP
// exists today — new chapters (odontogram, resep, etc.) get added here later
// without touching the layout around them.
type SectionId = 'soap';

const SECTIONS: { id: SectionId; label: string; icon: string }[] = [
  { id: 'soap', label: 'Catatan SOAP', icon: 'medical_services' },
];

function initialsFromName(name?: string) {
  if (!name) return '?';
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase() || '?'
  );
}

function statusLabel(status?: string) {
  if (status === 'arrived') return 'Menunggu';
  if (status === 'in_progress') return 'Berlangsung';
  if (status === 'finished') return 'Selesai';
  if (status === 'cancelled') return 'Batal';
  return '—';
}

export default function RekamMedisPage() {
  const params = useParams<{ encounterId: string }>();
  const router = useRouter();
  const { error: showError, success } = useToast();
  const encounterId = Number(params.encounterId);
  const isMounted = useRef(true);

  const [detail, setDetail] = useState<EncounterDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SectionId>('soap');

  const [subjective, setSubjective] = useState('');
  const [objective, setObjective] = useState('');
  const [assessment, setAssessment] = useState('');
  const [plan, setPlan] = useState('');
  const [signature, setSignature] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!encounterId) return;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const [d, note] = await Promise.all([
          encounterApi.detail(encounterId),
          encounterSoapApi.get(encounterId),
        ]);
        if (!isMounted.current) return;
        setDetail(d);
        if (note) {
          setSubjective(note.subjective || '');
          setObjective(note.objective || '');
          setAssessment(note.assessment || '');
          setPlan(note.plan || '');
          setSignature(note.signature || null);
        }
      } catch (err) {
        if (!isMounted.current) return;
        setLoadError(err instanceof ApiError ? err.message : 'Gagal memuat rekam medis');
      } finally {
        if (isMounted.current) setLoading(false);
      }
    })();
  }, [encounterId]);

  const goBackToVisit = () => router.push(`/list-kunjungan?encounterId=${encounterId}`);

  const handleSaveSoap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signature) {
      showError('Tanda tangan dokter wajib diisi');
      return;
    }
    setSubmitting(true);
    try {
      await encounterSoapApi.upsert(encounterId, {
        subjective: subjective.trim() || undefined,
        objective: objective.trim() || undefined,
        assessment: assessment.trim() || undefined,
        plan: plan.trim() || undefined,
        signature,
      });
      success('Catatan SOAP berhasil disimpan');
      goBackToVisit();
    } catch (err) {
      if (!isMounted.current) return;
      showError(err instanceof ApiError ? err.message : 'Gagal menyimpan pemeriksaan');
    } finally {
      if (isMounted.current) setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <FeatureGuard feature="kunjungan">
        <main className="content kunjungan-page rekam-medis-page">
          <button type="button" className="rm-back-btn" onClick={goBackToVisit}>
            <span className="material-symbols-rounded">arrow_back</span>
            Kembali ke Kunjungan
          </button>

          {loading ? (
            <div className="rm-loading">Memuat rekam medis…</div>
          ) : loadError || !detail ? (
            <div className="rm-loading error">{loadError || 'Kunjungan tidak ditemukan'}</div>
          ) : (
            <>
              <div className="rm-header">
                <div className="detail-avatar">{initialsFromName(detail.patient?.name)}</div>
                <div>
                  <div className="rm-patient-name">{detail.patient?.name || '—'}</div>
                  <div className="rm-patient-meta">
                    No. RM {detail.patient?.noRm || '—'} ·{' '}
                    {detail.practitioner?.name ? `dr. ${detail.practitioner.name}` : 'Dokter belum ditentukan'} ·{' '}
                    {statusLabel(detail.status)}
                  </div>
                </div>
              </div>

              <div className="rm-layout">
                <nav className="rm-sidebar">
                  <div className="rm-sidebar-title">Rekam Medis</div>
                  {SECTIONS.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className={`rm-sidebar-item ${activeSection === s.id ? 'active' : ''}`}
                      onClick={() => setActiveSection(s.id)}
                    >
                      <span className="material-symbols-rounded">{s.icon}</span>
                      {s.label}
                    </button>
                  ))}
                </nav>

                <div className="rm-content">
                  {activeSection === 'soap' && (
                    <form onSubmit={handleSaveSoap} className="rm-section">
                      <div className="rm-section-heading">
                        <h2>Catatan SOAP</h2>
                        <p>Isi dokumentasi klinis dan tanda tangan dokter untuk kunjungan ini</p>
                      </div>

                      <div className="rm-section-body">
                        <div className="visit-form-field">
                          <label>
                            <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>
                              medical_services
                            </span>
                            Dokter Pemeriksa
                          </label>
                          <input
                            type="text"
                            value={detail.practitioner?.name || '—'}
                            disabled
                            readOnly
                            className="visit-readonly-input"
                          />
                        </div>

                        <div className="visit-form-field">
                          <label>Subjective</label>
                          <textarea
                            value={subjective}
                            onChange={(e) => setSubjective(e.target.value)}
                            placeholder="Keluhan/cerita pasien menurut pasien sendiri (opsional)"
                            disabled={submitting}
                          />
                        </div>

                        <div className="visit-form-field">
                          <label>Objective</label>
                          <textarea
                            value={objective}
                            onChange={(e) => setObjective(e.target.value)}
                            placeholder="Hasil pemeriksaan objektif (opsional)"
                            disabled={submitting}
                          />
                        </div>

                        <div className="visit-form-field">
                          <label>Assessment</label>
                          <textarea
                            value={assessment}
                            onChange={(e) => setAssessment(e.target.value)}
                            placeholder="Diagnosis/penilaian klinis (opsional)"
                            disabled={submitting}
                          />
                        </div>

                        <div className="visit-form-field">
                          <label>Plan</label>
                          <textarea
                            value={plan}
                            onChange={(e) => setPlan(e.target.value)}
                            placeholder="Rencana tindakan/terapi (opsional)"
                            disabled={submitting}
                          />
                        </div>

                        <div className="visit-form-field">
                          <label>
                            Tanda Tangan Dokter <span className="req">*</span>
                          </label>
                          <SignaturePad value={signature || undefined} onChange={setSignature} disabled={submitting} />
                        </div>
                      </div>

                      <div className="rm-section-footer">
                        <button type="button" className="btn-outline" onClick={goBackToVisit} disabled={submitting}>
                          Batal
                        </button>
                        <button type="submit" className="btn-primary" disabled={submitting}>
                          <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>
                            check_circle
                          </span>
                          {submitting ? 'Menyimpan…' : 'Simpan SOAP'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </>
          )}
        </main>
      </FeatureGuard>
    </DashboardLayout>
  );
}
