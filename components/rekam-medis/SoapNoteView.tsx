'use client';

import { DiagnosisListView } from './DiagnosisPicker';
import type { SoapDiagnosis } from '@/lib/terminology';

interface SoapNoteViewProps {
  practitionerName?: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  diagnoses?: SoapDiagnosis[] | null;
  treatment?: string;
  plan?: string;
  controlPlan?: string;
  /** Data terkode SATUSEHAT, sudah dalam bentuk label */
  education?: string;
  prognosis?: string;
  dischargeCondition?: string;
  signature?: string | null;
  updatedAtLabel?: string | null;
  onEdit: () => void;
}

function ViewField({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rm-view-field">
      <label>{label}</label>
      {value ? <p className="rm-view-value">{value}</p> : <p className="rm-view-empty">Belum diisi</p>}
    </div>
  );
}

/**
 * Read-only display of a saved SOAP note — "bukan tempat isi saja". Opens
 * by default whenever a note already exists so the doctor (or anyone else
 * opening the record) can review Subjective/Objective/Assessment/Treatment/
 * Plan and the signature before editing. Resep Obat is its own tab now, not
 * shown here.
 */
export default function SoapNoteView({
  practitionerName,
  subjective,
  objective,
  assessment,
  diagnoses,
  treatment,
  plan,
  controlPlan,
  education,
  prognosis,
  dischargeCondition,
  signature,
  updatedAtLabel,
  onEdit,
}: SoapNoteViewProps) {
  return (
    <div className="rm-section">
      <div className="rm-section-heading rm-view-heading">
        <div>
          <h2>Catatan SOAP</h2>
          <p>
            {practitionerName ? `dr. ${practitionerName}` : 'Dokter belum ditentukan'}
            {updatedAtLabel && ` · Terakhir diperbarui ${updatedAtLabel}`}
          </p>
        </div>
        <button type="button" className="btn-outline" onClick={onEdit}>
          <span aria-hidden="true" className="material-symbols-rounded">edit</span>
          Edit
        </button>
      </div>

      <div className="rm-section-body">
        <ViewField label="S/ Subjective" value={subjective} />
        <ViewField label="O/ Objective" value={objective} />
        <ViewField label="A/ Assessment" value={assessment} />
        <div className="rm-view-field">
          <label>Diagnosis (ICD-10 / SNOMED CT)</label>
          <DiagnosisListView diagnoses={diagnoses} />
        </div>
        <ViewField label="Tr/ Treatment — tindakan pada kunjungan ini" value={treatment} />
        <ViewField label="P/ Plan (kunjungan berikutnya)" value={plan} />
        <ViewField label="Kontrol berikutnya" value={controlPlan} />
        <ViewField label="Edukasi ke pasien" value={education} />
        <ViewField label="Prognosis" value={prognosis} />
        <ViewField label="Kondisi saat pulang" value={dischargeCondition} />

        <div className="rm-view-field">
          <label>Tanda Tangan Dokter</label>
          {signature ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={signature} alt="Tanda tangan dokter" className="rm-view-signature" />
          ) : (
            <p className="rm-view-empty">Belum ditandatangani</p>
          )}
        </div>
      </div>
    </div>
  );
}
