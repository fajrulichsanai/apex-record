'use client';

import { useEffect, useState } from 'react';
import CustomSelect from '@/components/form/CustomSelect';
import { ApiError, fetchProtectedFileUrl } from '@/lib/api-client';
import { patientsApi, type Patient } from '@/lib/patients';
import { contentsApi, type ContentPhotoSource, type PickerFolder, type PickerPhoto } from '@/lib/contents';
import { useToast } from '@/lib/toast-context';
import { useEscapeKey } from '@/lib/a11y';

interface ClinicalPhotoPickerModalProps {
  onClose: () => void;
  onPick: (photo: PickerPhoto, sourceType: ContentPhotoSource) => void;
}

/**
 * Pilih foto pasien (folder Fase 1 atau Pemeriksaan Penunjang) untuk
 * dipakai sebagai foto before/after di Konten — hanya yang sudah consent
 * (PRD: Template Foto Pasien & Manajemen Konten).
 */
export default function ClinicalPhotoPickerModal({ onClose, onPick }: ClinicalPhotoPickerModalProps) {
  const { error } = useToast();
  useEscapeKey(onClose, true);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState('');
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingPicker, setLoadingPicker] = useState(false);
  const [folders, setFolders] = useState<PickerFolder[]>([]);
  const [supportingExam, setSupportingExam] = useState<PickerPhoto[]>([]);
  const [consentMarketing, setConsentMarketing] = useState<boolean | null>(null);
  const [thumbUrls, setThumbUrls] = useState<Record<number, string>>({});

  useEffect(() => {
    patientsApi
      .listAll()
      .then(setPatients)
      .catch(() => setPatients([]))
      .finally(() => setLoadingPatients(false));
  }, []);

  useEffect(() => {
    if (!patientId) {
      setFolders([]);
      setSupportingExam([]);
      setConsentMarketing(null);
      return;
    }
    let active = true;
    setLoadingPicker(true);
    contentsApi
      .picker(Number(patientId))
      .then((data) => {
        if (!active) return;
        setFolders(data.folders);
        setSupportingExam(data.supportingExam);
        setConsentMarketing(data.consentMarketing);
      })
      .catch((err) => {
        if (active) error(err instanceof ApiError ? err.message : 'Gagal memuat foto pasien');
      })
      .finally(() => {
        if (active) setLoadingPicker(false);
      });
    return () => {
      active = false;
    };
  }, [patientId, error]);

  useEffect(() => {
    const allPhotos = [...folders.flatMap((f) => f.photos), ...supportingExam];
    if (allPhotos.length === 0) return;
    let cancelled = false;
    const createdUrls: string[] = [];
    (async () => {
      const entries = await Promise.all(
        allPhotos.map(async (p) => {
          try {
            const url = await fetchProtectedFileUrl(p.fileUrl);
            createdUrls.push(url);
            return [p.id, url] as const;
          } catch {
            return null;
          }
        }),
      );
      if (cancelled) return;
      setThumbUrls(Object.fromEntries(entries.filter((e): e is readonly [number, string] => e !== null)));
    })();
    return () => {
      cancelled = true;
      createdUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [folders, supportingExam]);

  const patientOptions = patients.map((p) => ({ value: String(p.id), label: `${p.name}${p.noRm ? ` · ${p.noRm}` : ''}` }));
  const noPhotos = folders.every((f) => f.photos.length === 0) && supportingExam.length === 0;

  return (
    <div className="visit-modal-overlay" onClick={onClose}>
      <div className="visit-modal-box kt-picker-box" onClick={(e) => e.stopPropagation()}>
        <div className="visit-modal-header">
          <h2>Pilih dari Rekam Medis</h2>
          <button aria-label="Tutup" type="button" className="visit-modal-close" onClick={onClose}>
            <span aria-hidden="true" className="material-symbols-rounded">close</span>
          </button>
        </div>

        <div className="kt-picker-body">
          <div className="visit-form-field">
            <label>Pasien</label>
            <CustomSelect
              value={patientId}
              onChange={setPatientId}
              options={patientOptions}
              placeholder={loadingPatients ? 'Memuat pasien…' : 'Cari pasien…'}
              disabled={loadingPatients}
            />
          </div>

          {!patientId ? (
            <p className="kt-hint">Pilih pasien dulu untuk melihat foto klinisnya.</p>
          ) : loadingPicker ? (
            <p className="kt-hint">Memuat foto…</p>
          ) : consentMarketing === false || consentMarketing === null ? (
            <p className="kt-hint">
              Pasien ini belum memberi izin fotonya dipakai sebagai konten promosi. Minta persetujuan dulu di halaman rekam
              medis pasien (tab Galeri Foto Klinis) sebelum bisa dipilih di sini.
            </p>
          ) : noPhotos ? (
            <p className="kt-hint">Belum ada foto klinis atau pemeriksaan penunjang untuk pasien ini.</p>
          ) : (
            <>
              {folders.map(({ group, photos }) =>
                photos.length === 0 ? null : (
                  <div key={group?.id ?? 'lepas'} className="kt-picker-folder">
                    <h3>{group?.name ?? 'Foto bebas'}</h3>
                    <div className="kt-picker-grid">
                      {photos.map((photo) => (
                        <button
                          key={photo.id}
                          type="button"
                          className="kt-picker-thumb"
                          onClick={() => onPick(photo, 'patient_photo')}
                          title={photo.template?.name}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element -- backend-hosted upload */}
                          <img src={thumbUrls[photo.id]} alt={photo.template?.name || 'Foto'} />
                          <span>{photo.template?.name || 'Foto'}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ),
              )}
              {supportingExam.length > 0 && (
                <div className="kt-picker-folder">
                  <h3>Pemeriksaan Penunjang</h3>
                  <div className="kt-picker-grid">
                    {supportingExam.map((photo) => (
                      <button
                        key={photo.id}
                        type="button"
                        className="kt-picker-thumb"
                        onClick={() => onPick(photo, 'supporting_exam_image')}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- backend-hosted upload */}
                        <img src={thumbUrls[photo.id]} alt={photo.imageType === 'xray' ? 'Rontgen' : 'Foto'} />
                        <span>{photo.category || (photo.imageType === 'xray' ? 'Rontgen' : 'Foto')}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
