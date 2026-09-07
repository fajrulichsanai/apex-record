'use client';

import { useEffect, useState } from 'react';
import { ApiError } from '@/lib/api-client';
import { patientsApi, type Patient } from '@/lib/patients';
import { tarifApi, type Tarif } from '@/lib/tarif';
import {
  consentTemplateApi,
  patientConsentApi,
  CONSENT_SIGNER_RELATION_LABEL,
  type ConsentTemplate,
  type ConsentSignerRelation,
  type PatientConsent,
} from '@/lib/consent';
import { useToast } from '@/lib/toast-context';
import SignaturePad from '@/components/form/SignaturePad';
import CustomSelect from '@/components/form/CustomSelect';

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

export default function PatientConsentList() {
  const { success, error } = useToast();
  const [consents, setConsents] = useState<PatientConsent[]>([]);
  const [loading, setLoading] = useState(true);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [tarifs, setTarifs] = useState<Tarif[]>([]);
  const [templates, setTemplates] = useState<ConsentTemplate[]>([]);

  const [showCreate, setShowCreate] = useState(false);
  const [createPatientId, setCreatePatientId] = useState('');
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
      const res = await patientConsentApi.list({ limit: 100 });
      setConsents(res.data);
    } catch (err) {
      error(err instanceof ApiError ? err.message : 'Gagal memuat formulir persetujuan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    Promise.all([patientsApi.listAll(), tarifApi.list(), consentTemplateApi.list()])
      .then(([patientList, tarifRes, templateList]) => {
        setPatients(patientList);
        setTarifs(tarifRes.data);
        setTemplates(templateList);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tarifsWithTemplate = tarifs.filter((t) => templates.some((tpl) => tpl.tarifId === t.id));

  const handleCreate = async () => {
    if (!createPatientId || !createTarifId) {
      error('Pilih pasien dan tindakan terlebih dahulu');
      return;
    }
    setCreating(true);
    try {
      await patientConsentApi.create({
        patientId: Number(createPatientId),
        tarifId: Number(createTarifId),
      });
      success('Formulir persetujuan berhasil dibuat');
      setShowCreate(false);
      setCreatePatientId('');
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

  const patientOptions = patients.map((p) => ({
    value: p.id.toString(),
    label: `${p.name}${p.noRm ? ` (${p.noRm})` : ''}`,
  }));
  const tarifOptions = tarifsWithTemplate.map((t) => ({ value: t.id.toString(), label: t.name }));

  return (
    <>
      <div className="panel">
        <div className="panel-toolbar">
          <span style={{ fontSize: 13, color: 'var(--text-sub)' }}>
            Formulir persetujuan tindakan pasien. Tidak dikirim otomatis — unduh PDF secara manual saat dibutuhkan.
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
            <div className="empty-title">Belum ada formulir persetujuan</div>
            <div className="empty-sub">Buat formulir baru untuk pasien yang akan menjalani tindakan.</div>
          </div>
        ) : (
          <div className="fee-table-wrap">
            <table className="fee-table">
              <thead>
                <tr>
                  <th>Pasien</th>
                  <th>Tindakan</th>
                  <th>Dibuat</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {consents.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="tarif-name">{c.patient?.name || '-'}</div>
                      <div className="tarif-kategori">{c.patient?.noRm || ''}</div>
                    </td>
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

      {showCreate && (
        <div className="consent-modal-overlay" onClick={() => !creating && setShowCreate(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-title">
                <div className="modal-header-icon"><span className="material-symbols-rounded">add</span></div>
                <div>
                  <h2>Buat Formulir Persetujuan</h2>
                  <p>Pilih pasien dan tindakan yang memerlukan persetujuan</p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowCreate(false)} aria-label="Tutup">
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-field">
                <label>Pasien</label>
                <CustomSelect value={createPatientId} onChange={setCreatePatientId} options={patientOptions} placeholder="Cari dan pilih pasien..." />
              </div>
              <div className="form-field">
                <label>Tindakan</label>
                <CustomSelect value={createTarifId} onChange={setCreateTarifId} options={tarifOptions} placeholder="Pilih tindakan..." />
                {tarifOptions.length === 0 && (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Belum ada tindakan dengan template persetujuan. Atur di tab &quot;Konfigurasi Template&quot;.
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
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-title">
                <div className="modal-header-icon"><span className="material-symbols-rounded">draw</span></div>
                <div>
                  <h2>{signTarget.role === 'patient' ? 'Tanda Tangan Pasien' : 'Tanda Tangan Dokter'}</h2>
                  <p>{signTarget.consent.title}</p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setSignTarget(null)} aria-label="Tutup">
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>
            <div className="modal-body">
              <div className="consent-preview">{signTarget.consent.content}</div>
              {signTarget.role === 'patient' && (
                <>
                  <div className="form-field">
                    <label>Hubungan dengan Pasien</label>
                    <div className="relation-options">
                      {(Object.keys(CONSENT_SIGNER_RELATION_LABEL) as ConsentSignerRelation[]).map((rel) => (
                        <button
                          key={rel}
                          type="button"
                          className={`relation-option ${signerRelation === rel ? 'active' : ''}`}
                          onClick={() => handleRelationChange(rel)}
                        >
                          {CONSENT_SIGNER_RELATION_LABEL[rel]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="form-field">
                    <label>Nama Penanda Tangan (pasien/wali)</label>
                    <input type="text" value={signerName} onChange={(e) => setSignerName(e.target.value)} />
                  </div>
                  <div className="form-field">
                    <label>Alamat</label>
                    <input type="text" value={signerAddress} onChange={(e) => setSignerAddress(e.target.value)} />
                  </div>
                  <div className="form-field">
                    <label>No. Telp</label>
                    <input type="text" value={signerPhone} onChange={(e) => setSignerPhone(e.target.value)} />
                  </div>
                </>
              )}
              <div className="form-field">
                <label>Tanda Tangan</label>
                <SignaturePad value={signatureData || undefined} onChange={setSignatureData} />
              </div>
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
    </>
  );
}
