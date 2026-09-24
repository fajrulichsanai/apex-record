'use client';

import { useState } from 'react';
import CustomSelect from '@/components/form/CustomSelect';
import { ToothCondition, UpsertToothConditionPayload } from '@/lib/odontogram';
import { getToothLayout, SURFACE_OPTIONS, TEKS_ATAS_OPTIONS, TEKS_BAWAH_OPTIONS, teksDescription } from './odontogramData';

interface ToothDetailModalProps {
  toothNumber: number;
  condition?: ToothCondition;
  submitting?: boolean;
  onSave: (payload: UpsertToothConditionPayload) => void;
  onClose: () => void;
}

export default function ToothDetailModal({ toothNumber, condition, submitting, onSave, onClose }: ToothDetailModalProps) {
  const layout = getToothLayout(toothNumber);

  const [teksAtas, setTeksAtas] = useState(condition?.teksAtas || '');
  const [teksBawah, setTeksBawah] = useState(condition?.teksBawah || '');
  const [rct, setRct] = useState(condition?.rct || false);
  const [mesial, setMesial] = useState(condition?.surfaceMesial || '');
  const [distal, setDistal] = useState(condition?.surfaceDistal || '');
  const [vestibular, setVestibular] = useState(condition?.surfaceVestibular || '');
  const [lingual, setLingual] = useState(condition?.surfaceLingual || '');
  const [occlusal, setOcclusal] = useState(condition?.surfaceOcclusal || '');
  const [notes, setNotes] = useState(condition?.notes || '');

  const isMissing = teksBawah === 'MISSING';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      teksAtas: teksAtas || undefined,
      teksBawah: teksBawah || undefined,
      rct,
      surfaceMesial: isMissing ? undefined : mesial || undefined,
      surfaceDistal: isMissing ? undefined : distal || undefined,
      surfaceVestibular: isMissing ? undefined : vestibular || undefined,
      surfaceLingual: isMissing ? undefined : lingual || undefined,
      surfaceOcclusal: isMissing ? undefined : occlusal || undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="visit-modal-overlay" onClick={onClose}>
      <div className="visit-modal-box odt-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="visit-modal-header">
          <div>
            <h2>Gigi {toothNumber}</h2>
            <p>
              {layout.isAnterior ? 'Gigi anterior' : 'Gigi posterior'} · {layout.isUpper ? 'Rahang atas' : 'Rahang bawah'}
              {layout.isDeciduous ? ' · Gigi susu' : ''}
            </p>
          </div>
          <button type="button" className="visit-modal-close" onClick={onClose} disabled={submitting}>
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="odt-modal-body">
            <div className="rm-field-grid cols-2">
              <div className="visit-form-field">
                <label>Teks Atas</label>
                <CustomSelect value={teksAtas} onChange={setTeksAtas} options={TEKS_ATAS_OPTIONS} disabled={submitting} />
                {teksAtas && <p className="odt-teks-hint">{teksDescription(teksAtas)}</p>}
              </div>
              <div className="visit-form-field">
                <label>Teks Bawah</label>
                <CustomSelect value={teksBawah} onChange={setTeksBawah} options={TEKS_BAWAH_OPTIONS} disabled={submitting} />
                {teksBawah && <p className="odt-teks-hint">{teksDescription(teksBawah)}</p>}
              </div>
            </div>

            <label className="odt-rct-toggle">
              <input type="checkbox" checked={rct} onChange={(e) => setRct(e.target.checked)} disabled={submitting} />
              Root Canal Treatment (RCT)
            </label>

            {!isMissing && (
              <>
                <div className="odt-fieldset-title">Kondisi per Permukaan</div>
                <div className="rm-field-grid cols-3">
                  <div className="visit-form-field">
                    <label>Mesial</label>
                    <CustomSelect value={mesial} onChange={setMesial} options={SURFACE_OPTIONS} disabled={submitting} />
                  </div>
                  <div className="visit-form-field">
                    <label>Distal</label>
                    <CustomSelect value={distal} onChange={setDistal} options={SURFACE_OPTIONS} disabled={submitting} />
                  </div>
                  <div className="visit-form-field">
                    <label>Vestibular</label>
                    <CustomSelect value={vestibular} onChange={setVestibular} options={SURFACE_OPTIONS} disabled={submitting} />
                  </div>
                  <div className="visit-form-field">
                    <label>{layout.lingualLabel}</label>
                    <CustomSelect value={lingual} onChange={setLingual} options={SURFACE_OPTIONS} disabled={submitting} />
                  </div>
                  <div className="visit-form-field">
                    <label>{layout.centerLabel}</label>
                    <CustomSelect value={occlusal} onChange={setOcclusal} options={SURFACE_OPTIONS} disabled={submitting} />
                  </div>
                </div>
              </>
            )}

            <div className="visit-form-field">
              <label>Catatan</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Catatan tambahan (opsional)" disabled={submitting} />
            </div>
          </div>

          <div className="rm-section-footer">
            <button type="button" className="btn-outline" onClick={onClose} disabled={submitting}>
              Batal
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>
                check_circle
              </span>
              {submitting ? 'Menyimpan…' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
