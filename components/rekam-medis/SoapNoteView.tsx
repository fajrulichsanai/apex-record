'use client';

import PrescriptionPanel from '@/components/form/PrescriptionPanel';

interface SoapNoteViewProps {
  encounterId: number;
  practitionerName?: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  treatment?: string;
  plan?: string;
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
 * opening the record) can review Subjective/Objective/Assessment/Treatment
 * (incl. the prescriptions given)/Plan and the signature before editing.
 */
export default function SoapNoteView({
  encounterId,
  practitionerName,
  subjective,
  objective,
  assessment,
  treatment,
  plan,
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
          <span className="material-symbols-rounded">edit</span>
          Edit
        </button>
      </div>

      <div className="rm-section-body">
        <ViewField label="Subjective" value={subjective} />
        <ViewField label="Objective" value={objective} />
        <ViewField label="Assessment" value={assessment} />

        <div className="rm-fieldset">
          <div className="rm-fieldset-title">
            <span className="material-symbols-rounded">clinical_notes</span>
            Treatment — tindakan pada kunjungan ini
          </div>
          {treatment ? <p className="rm-view-value">{treatment}</p> : <p className="rm-view-empty">Belum diisi</p>}
          <div className="rm-view-field">
            <label>Resep Obat</label>
            <PrescriptionPanel encounterId={encounterId} disabled />
          </div>
        </div>

        <ViewField label="Plan (kunjungan berikutnya)" value={plan} />

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
