'use client';

import type { ClinicResponse } from '@/lib/clinic';
import { CONSENT_SIGNER_RELATION_LABEL, type ConsentSignerRelation, type PatientConsent } from '@/lib/consent';
import SignaturePad from '@/components/form/SignaturePad';

const CONSENT_STATEMENTS = [
  'Dokter telah menjelaskan kepada saya mengenai diagnosis, rencana perawatan, tujuan tindakan, risiko, serta alternatif perawatan yang tersedia.',
  'Saya telah diberikan kesempatan untuk mengajukan pertanyaan dan seluruh pertanyaan saya telah dijawab dengan jelas.',
  'Saya memahami bahwa hasil tindakan medis tidak dapat dijamin sepenuhnya dan terdapat risiko yang mungkin terjadi di luar kemampuan dokter.',
  'Persetujuan ini saya berikan dengan penuh kesadaran, tanpa paksaan dari pihak manapun.',
];

function calculateAge(birthDate?: string | null): number | null {
  if (!birthDate) return null;
  const dob = new Date(birthDate);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age;
}

function genderLabel(gender?: 'male' | 'female' | null) {
  if (gender === 'male') return 'Laki-laki';
  if (gender === 'female') return 'Perempuan';
  return null;
}

function ageGenderText(birthDate?: string | null, gender?: 'male' | 'female' | null) {
  const age = calculateAge(birthDate);
  const g = genderLabel(gender);
  return [age !== null ? `${age} tahun` : null, g].filter(Boolean).join(', ') || '-';
}

interface DocRowProps {
  label: string;
  value?: string;
  editable?: boolean;
  onChange?: (v: string) => void;
  placeholder?: string;
}

function DocRow({ label, value, editable, onChange, placeholder }: DocRowProps) {
  return (
    <div className="consent-doc-row">
      <span className="consent-doc-row-label">{label}</span>
      <span className="consent-doc-row-colon">:</span>
      {editable ? (
        <input
          className="consent-doc-row-input"
          type="text"
          value={value || ''}
          placeholder={placeholder}
          onChange={(e) => onChange?.(e.target.value)}
        />
      ) : (
        <span className="consent-doc-row-value">{value || '-'}</span>
      )}
    </div>
  );
}

interface ConsentDocumentProps {
  consent: PatientConsent;
  clinic: ClinicResponse | null;
  activeRole: 'patient' | 'doctor';
  doctorName?: string;

  signerName: string;
  onSignerNameChange: (v: string) => void;
  signerRelation: ConsentSignerRelation;
  onSignerRelationChange: (v: ConsentSignerRelation) => void;
  signerAddress: string;
  onSignerAddressChange: (v: string) => void;
  signerPhone: string;
  onSignerPhoneChange: (v: string) => void;

  signatureData: string | null;
  onSignatureChange: (v: string | null) => void;
}

export default function ConsentDocument({
  consent,
  clinic,
  activeRole,
  doctorName,
  signerName,
  onSignerNameChange,
  signerRelation,
  onSignerRelationChange,
  signerAddress,
  onSignerAddressChange,
  signerPhone,
  onSignerPhoneChange,
  signatureData,
  onSignatureChange,
}: ConsentDocumentProps) {
  const patient = consent.patient;
  const isSelf = signerRelation === 'self';
  const patientAgeGender = ageGenderText(patient?.birthDate, patient?.gender);

  return (
    <div className="consent-doc">
      <div className="consent-doc-header">
        {clinic?.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={clinic.logoUrl} alt="" className="consent-doc-logo" />
        )}
        <div className="consent-doc-clinic">
          <div className="consent-doc-clinic-name">{clinic?.name || 'Klinik'}</div>
          {clinic?.address && <div className="consent-doc-clinic-meta">{clinic.address}</div>}
          {clinic?.phone && <div className="consent-doc-clinic-meta">Telp/WA: {clinic.phone}</div>}
        </div>
      </div>
      <div className="consent-doc-rule" />

      <h3 className="consent-doc-title">PERSETUJUAN TINDAKAN MEDIS</h3>
      <p className="consent-doc-subtitle">(INFORMED CONSENT)</p>

      <p className="consent-doc-text">Saya yang bertanda tangan di bawah ini:</p>
      <div className="consent-doc-block">
        <DocRow
          label="Nama"
          value={signerName}
          editable={activeRole === 'patient'}
          onChange={onSignerNameChange}
          placeholder="Nama penanda tangan"
        />
        <DocRow label="No. RM" value={patient?.noRm} />
        <DocRow label="Umur, Jenis Kelamin" value={isSelf ? patientAgeGender : '-'} />
        <DocRow
          label="Alamat"
          value={signerAddress}
          editable={activeRole === 'patient'}
          onChange={onSignerAddressChange}
          placeholder="Alamat penanda tangan"
        />
        <DocRow
          label="No. Telp"
          value={signerPhone}
          editable={activeRole === 'patient'}
          onChange={onSignerPhoneChange}
          placeholder="No. telp penanda tangan"
        />
        <div className="consent-doc-row">
          <span className="consent-doc-row-label">Hubungan dengan pasien</span>
          <span className="consent-doc-row-colon">:</span>
          {activeRole === 'patient' ? (
            <div className="consent-doc-relation-options">
              {(Object.keys(CONSENT_SIGNER_RELATION_LABEL) as ConsentSignerRelation[]).map((rel) => (
                <button
                  key={rel}
                  type="button"
                  className={`consent-doc-relation-chip ${signerRelation === rel ? 'active' : ''}`}
                  onClick={() => onSignerRelationChange(rel)}
                >
                  {CONSENT_SIGNER_RELATION_LABEL[rel]}
                </button>
              ))}
            </div>
          ) : (
            <span className="consent-doc-row-value">{CONSENT_SIGNER_RELATION_LABEL[signerRelation]}</span>
          )}
        </div>
      </div>

      <p className="consent-doc-text">
        Dengan ini menyatakan <b>SETUJU</b> atas tindakan medis yang akan dilakukan berupa:{' '}
        <b>{consent.tarif?.name || consent.title}</b>
      </p>

      <p className="consent-doc-text">Terhadap diri saya / pasien berikut:</p>
      <div className="consent-doc-block">
        <DocRow label="Nama" value={patient?.name} />
        <DocRow label="Umur, Jenis Kelamin" value={patientAgeGender} />
        <DocRow label="Alamat" value={patient?.address} />
        <DocRow label="No. Telp" value={patient?.phone} />
      </div>

      <p className="consent-doc-text">Saya menyatakan bahwa:</p>
      <ol className="consent-doc-list">
        {CONSENT_STATEMENTS.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
      {consent.content && <p className="consent-doc-text consent-doc-note">{consent.content}</p>}

      <div className="consent-doc-signatures">
        <div className="consent-doc-sigbox">
          <span className="consent-doc-sig-label">Pasien / Wali</span>
          {activeRole === 'patient' ? (
            <SignaturePad value={signatureData || undefined} onChange={onSignatureChange} height={130} />
          ) : (
            <div className="consent-doc-sig-static">
              {consent.patientSignature ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={consent.patientSignature} alt="Tanda tangan pasien" />
              ) : (
                <span className="consent-doc-sig-empty">Belum ditandatangani</span>
              )}
            </div>
          )}
          <div className="consent-doc-sig-line" />
          <span className="consent-doc-sig-name">
            {activeRole === 'patient' ? signerName || '-' : consent.patientSignerName || '-'}
          </span>
        </div>

        <div className="consent-doc-sigbox">
          <span className="consent-doc-sig-label">Dokter</span>
          {activeRole === 'doctor' ? (
            <SignaturePad value={signatureData || undefined} onChange={onSignatureChange} height={130} />
          ) : (
            <div className="consent-doc-sig-static">
              {consent.doctorSignature ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={consent.doctorSignature} alt="Tanda tangan dokter" />
              ) : (
                <span className="consent-doc-sig-empty">Belum ditandatangani</span>
              )}
            </div>
          )}
          <div className="consent-doc-sig-line" />
          <span className="consent-doc-sig-name">{doctorName || '-'}</span>
        </div>
      </div>
    </div>
  );
}
