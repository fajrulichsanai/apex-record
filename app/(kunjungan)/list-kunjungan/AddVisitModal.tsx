'use client';

import { useState } from 'react';

export interface NewVisitInput {
  patientName: string;
  doctor: string;
  visitType: string;
  date: string;
  time: string;
  notes: string;
}

const PATIENT_OPTIONS = ['Mu** Da** Sa**', 'Ahmad Ri**', 'By. Ny. Sa**', 'Budi Su**', 'Siti Ra**'];
const DOCTOR_OPTIONS = ['drg. Rina Susanti', 'drg. Anton Wijaya', 'drg. Lestari Putri'];
const VISIT_TYPE_OPTIONS = [
  'Konsultasi Awal',
  'Pembersihan Karang Gigi',
  'Cabut Gigi',
  'Tambal Gigi',
  'Kontrol Rutin',
];

interface AddVisitModalProps {
  onClose: () => void;
  onCreate: (visit: NewVisitInput) => void;
}

export default function AddVisitModal({ onClose, onCreate }: AddVisitModalProps) {
  const [form, setForm] = useState<NewVisitInput>({
    patientName: '',
    doctor: DOCTOR_OPTIONS[0],
    visitType: VISIT_TYPE_OPTIONS[0],
    date: new Date().toISOString().slice(0, 10),
    time: '09:00',
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientName.trim()) return;
    onCreate(form);
  };

  return (
    <div className="kunjungan-modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Buat Kunjungan</h2>
          <button className="modal-close" onClick={onClose}>
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-field full">
                <label>Pasien</label>
                <input
                  type="text"
                  list="patient-options"
                  placeholder="Cari nama pasien…"
                  value={form.patientName}
                  onChange={(e) => setForm({ ...form, patientName: e.target.value })}
                  required
                />
                <datalist id="patient-options">
                  {PATIENT_OPTIONS.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
              </div>
              <div className="form-field">
                <label>Dokter</label>
                <select
                  value={form.doctor}
                  onChange={(e) => setForm({ ...form, doctor: e.target.value })}
                >
                  {DOCTOR_OPTIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label>Jenis Kunjungan</label>
                <select
                  value={form.visitType}
                  onChange={(e) => setForm({ ...form, visitType: e.target.value })}
                >
                  {VISIT_TYPE_OPTIONS.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label>Tanggal</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                />
              </div>
              <div className="form-field">
                <label>Jam</label>
                <input
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                  required
                />
              </div>
              <div className="form-field full">
                <label>Catatan</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Catatan tambahan (opsional)"
                />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-outline" onClick={onClose}>
              Batal
            </button>
            <button type="submit" className="btn-primary">
              Simpan Kunjungan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
