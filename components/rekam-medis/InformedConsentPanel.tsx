'use client';

import { useEffect, useState } from 'react';
import { ApiError } from '@/lib/api-client';
import { tarifApi, type Tarif } from '@/lib/tarif';
import { clinicApi, type ClinicResponse } from '@/lib/clinic';
import {
  consentTemplateApi,
  patientConsentApi,
  type ConsentTemplate,
  type ConsentSignerRelation,
  type PatientConsent,
} from '@/lib/consent';
import { useToast } from '@/lib/toast-context';
import { useAuth } from '@/lib/auth-context';
import CustomSelect from '@/components/form/CustomSelect';
import ConsentDocument from '@/components/informed-consent/ConsentDocument';
import ConsentTemplateConfigTable from '@/components/informed-consent/ConsentTemplateConfigTable';
import '../../app/styles/informed-consent.css';

const STATUS_LABEL: Record<PatientConsent['status'], string> = {
  draft: 'Belum Ditandatangani',
  partial: 'Menunggu 1 Tanda Tangan',
  completed: 'Selesai',
};

const STATUS_TAG_CLASS: Record<PatientConsent['status'], string> = {
  draft: 'tag-draft',
  partial: 'tag-partial',
  completed: 'tag-completed',
};

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface SignTarget {
  consent: PatientConsent;
  role: 'patient' | 'doctor';
}

interface InformedConsentPanelProps {
  patientId: number;
  encounterId: number;
}

/**
 * Informed consent for THIS visit — moved here (from the old standalone
 * "Operasional > Informed Consent" page) because a consent form only ever
 * makes sense in the context of a specific patient's visit, not as a
 * clinic-wide list. Scoped to encounterId so only forms created for this
 * kunjungan show up here.
 */
export default function InformedConsentPanel({ patientId, encounterId }: InformedConsentPanelProps) {
  const { success, error } = useToast();
  const { user } = useAuth();
  const canEditTemplate = user?.role === 'owner' || user?.role === 'super_admin';

  const [view, setView] = useState<'forms' | 'config'>('forms');

  const [consents, setConsents] = useState<PatientConsent[]>([]);
  const [loading, setLoading] = useState(true);

  const [tarifs, setTarifs] = useState<Tarif[]>([]);
  const [templates, setTemplates] = useState<ConsentTemplate[]>([]);
  const [clinic, setClinic] = useState<ClinicResponse | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [createTarifId, setCreateTarifId] = useState('');
  const [creating, setCreating] = useState(false);

  const [signTarget, setSignTarget] = useState<SignTarget | null>(null);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [signerName, setSignerName] = useState('');
  const [signerRelation, setSignerRelation] = useState<ConsentSignerRelation>('self');
  const [signerAddress, setSignerAddress] = useState('');
  const [signerPhone, setSignerPhone] = useState('');
  const [signing, setSigning] = useState(false);

  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await patientConsentApi.list({ encounterId, limit: 100 });
      setConsents(res.data);
    } catch (err) {
      error(err instanceof ApiError ? err.message : 'Gagal memuat formulir persetujuan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    Promise.all([tarifApi.list(), consentTemplateApi.list(), clinicApi.get()])
      .then(([tarifRes, templateList, clinicRes]) => {
        setTarifs(tarifRes.data);
        setTemplates(templateList);
        setClinic(clinicRes);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encounterId]);

  const tarifsWithTemplate = tarifs.filter((t) => templates.some((tpl) => tpl.tarifId === t.id));
  const tarifOptions = tarifsWithTemplate.map((t) => ({ value: t.id.toString(), label: t.name }));

  const handleCreate = async () => {
    if (!createTarifId) {
      error('Pilih tindakan terlebih dahulu');
      return;
    }
    setCreating(true);
    try {
      await patientConsentApi.create({
        patientId,
        encounterId,
        tarifId: Number(createTarifId),
      });
      success('Formulir persetujuan berhasil dibuat');
      setShowCreate(false);
      setCreateTarifId('');
      load();
    } catch (err) {
      error(err instanceof ApiError ? err.message : 'Gagal membuat formulir persetujuan');
    } finally {
      setCreating(false);
    }
  };

  const openSign = (consent: PatientConsent, role: 'patient' | 'doctor') => {
    setSignTarget({ consent, role });
    setSignatureData(null);
    setSignerName(role === 'patient' ? consent.patient?.name || '' : '');
    setSignerRelation('self');
    setSignerAddress(consent.patient?.address || '');
    setSignerPhone(consent.patient?.phone || '');
  };

  const handleRelationChange = (relation: ConsentSignerRelation) => {
    setSignerRelation(relation);
    if (relation === 'self') {
      setSignerName(signTarget?.consent.patient?.name || '');
      setSignerAddress(signTarget?.consent.patient?.address || '');
      setSignerPhone(signTarget?.consent.patient?.phone || '');
    } else {
      setSignerName('');
      setSignerAddress('');
      setSignerPhone('');
    }
  };

  const handleSign = async () => {
    if (!signTarget || !signatureData) {
      error('Tanda tangan belum dibuat');
      return;
    }
    setSigning(true);
    try {
      await patientConsentApi.sign(signTarget.consent.id, {
        role: signTarget.role,
        signatureDataUrl: signatureData,
        signerName: signTarget.role === 'patient' ? signerName || undefined : undefined,
        signerRelation: signTarget.role === 'patient' ? signerRelation : undefined,
        signerAddress: signTarget.role === 'patient' ? signerAddress || undefined : undefined,
        signerPhone: signTarget.role === 'patient' ? signerPhone || undefined : undefined,
      });
      success('Tanda tangan berhasil disimpan');
      setSignTarget(null);
      load();
    } catch (err) {
      error(err instanceof ApiError ? err.message : 'Gagal menyimpan tanda tangan');
    } finally {
      setSigning(false);
    }
  };

  const handleDownload = async (id: number) => {
    setDownloadingId(id);
    try {
      await patientConsentApi.downloadPdf(id);
    } catch (err) {
      error(err instanceof ApiError ? err.message : 'Gagal mengunduh PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="consent-page">
      {canEditTemplate && (
        <div className="tab-bar">
          <button type="button" className={`filter-tab ${view === 'forms' ? 'active' : ''}`} onClick={() => setView('forms')}>
            Formulir Kunjungan Ini
          </button>
          <button type="button" className={`filter-tab ${view === 'config' ? 'active' : ''}`} onClick={() => setView('config')}>
            Konfigurasi Template
          </button>
        </div>
      )}

      {view === 'config' ? (
        <div className="panel">
          <div className="panel-toolbar">
            <span style={{ fontSize: 13, color: 'var(--text-sub)' }}>
              Atur teks persetujuan untuk setiap tindakan yang membutuhkan informed consent. Berlaku untuk semua pasien di klinik ini.
            </span>
          </div>
          <ConsentTemplateConfigTable canEdit={canEditTemplate} />
        </div>
      ) : (
        <div className="panel">
          <div className="panel-toolbar">
            <span style={{ fontSize: 13, color: 'var(--text-sub)' }}>
              Formulir persetujuan tindakan untuk kunjungan ini. Tidak dikirim otomatis — unduh PDF secara manual saat dibutuhkan.
            </span>
            <button type="button" className="btn-primary" onClick={() => setShowCreate(true)}>
              <span className="material-symbols-rounded" style={{ fontSize: 18 }}>add</span>
              Buat Formulir Baru
            </button>
          </div>

          {loading ? (
            <div className="empty-list">
              <div className="empty-icon-wrap"><span className="material-symbols-rounded">hourglass_empty</span></div>
              <div className="empty-title">Memuat formulir...</div>
            </div>
          ) : consents.length === 0 ? (
            <div className="empty-list">
              <div className="empty-icon-wrap"><span className="material-symbols-rounded">description</span></div>
              <div className="empty-title">Belum ada formulir persetujuan untuk kunjungan ini</div>
              <div className="empty-sub">Buat formulir baru jika kunjungan ini memerlukan tindakan yang butuh persetujuan.</div>
            </div>
          ) : (
            <div className="fee-table-wrap">
              <table className="fee-table">
                <thead>
                  <tr>
                    <th>Tindakan</th>
                    <th>Dibuat</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {consents.map((c) => (
                    <tr key={c.id}>
                      <td>{c.tarif?.name || '-'}</td>
                      <td>{formatDate(c.createdAt)}</td>
                      <td><span className={`tag ${STATUS_TAG_CLASS[c.status]}`}>{STATUS_LABEL[c.status]}</span></td>
                      <td>
                        <div className="row-actions">
                          {!c.patientSignature && (
                            <button type="button" className="btn-row-save" onClick={() => openSign(c, 'patient')}>
                              TTD Pasien
                            </button>
                          )}
                          {!c.doctorSignature && (
                            <button type="button" className="btn-row-save" onClick={() => openSign(c, 'doctor')}>
                              TTD Dokter
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn-row-save"
                            disabled={downloadingId === c.id}
                            onClick={() => handleDownload(c.id)}
                          >
                            {downloadingId === c.id ? 'Mengunduh...' : 'Unduh PDF'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showCreate && (
        <div className="consent-modal-overlay" onClick={() => !creating && setShowCreate(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-title">
                <div className="modal-header-icon"><span className="material-symbols-rounded">add</span></div>
                <div>
                  <h2>Buat Formulir Persetujuan</h2>
                  <p>Pilih tindakan pada kunjungan ini yang memerlukan persetujuan</p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowCreate(false)} aria-label="Tutup">
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-field">
                <label>Tindakan</label>
                <CustomSelect value={createTarifId} onChange={setCreateTarifId} options={tarifOptions} placeholder="Pilih tindakan..." />
                {tarifOptions.length === 0 && (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Belum ada tindakan dengan template persetujuan.
                    {canEditTemplate ? ' Atur di tab "Konfigurasi Template".' : ' Hubungi Owner klinik untuk mengaturnya.'}
                  </span>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-outline" onClick={() => setShowCreate(false)} disabled={creating}>Batal</button>
              <button type="button" className="btn-primary" onClick={handleCreate} disabled={creating}>
                {creating ? 'Membuat...' : 'Buat Formulir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {signTarget && (
        <div className="consent-modal-overlay" onClick={() => !signing && setSignTarget(null)}>
          <div className="modal-box doc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-title">
                <div className="modal-header-icon"><span className="material-symbols-rounded">draw</span></div>
                <div>
                  <h2>{signTarget.role === 'patient' ? 'Tanda Tangan Pasien' : 'Tanda Tangan Dokter'}</h2>
                  <p>Tanda tangani langsung pada kolom yang tersedia di bawah, seperti menandatangani kertas.</p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setSignTarget(null)} aria-label="Tutup">
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>
            <div className="modal-body doc-modal-body">
              <ConsentDocument
                consent={signTarget.consent}
                clinic={clinic}
                activeRole={signTarget.role}
                doctorName={signTarget.role === 'doctor' ? user?.name : undefined}
                signerName={signerName}
                onSignerNameChange={setSignerName}
                signerRelation={signerRelation}
                onSignerRelationChange={handleRelationChange}
                signerAddress={signerAddress}
                onSignerAddressChange={setSignerAddress}
                signerPhone={signerPhone}
                onSignerPhoneChange={setSignerPhone}
                signatureData={signatureData}
                onSignatureChange={setSignatureData}
              />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-outline" onClick={() => setSignTarget(null)} disabled={signing}>Batal</button>
              <button type="button" className="btn-primary" onClick={handleSign} disabled={signing || !signatureData}>
                {signing ? 'Menyimpan...' : 'Simpan Tanda Tangan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
