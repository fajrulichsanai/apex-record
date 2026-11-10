'use client';

import { useEffect, useRef, useState } from 'react';
import CustomSelect from '@/components/form/CustomSelect';
import { ApiError } from '@/lib/api-client';
import { clinicalPhotosApi, photoTemplateGroupsApi, type PhotoTemplateGroup } from '@/lib/clinical-photos';
import { compressImage } from '@/lib/image-compress';
import { useToast } from '@/lib/toast-context';

interface PatientPhotoUploaderProps {
  patientId: number;
  /** Dipanggil setelah ada foto yang berhasil masuk, supaya galeri dimuat ulang. */
  onUploaded: () => void;
}

/**
 * Unggah foto langsung ke rekam medis pasien — tidak perlu ada kunjungan.
 * Bisa banyak foto sekaligus (pilih atau seret-lepas); opsional taruh ke
 * folder/slot tertentu, kalau tidak masuk sebagai foto bebas.
 */
export default function PatientPhotoUploader({ patientId, onUploaded }: PatientPhotoUploaderProps) {
  const { success, error } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [groups, setGroups] = useState<PhotoTemplateGroup[]>([]);
  const [groupId, setGroupId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [over, setOver] = useState(false);

  useEffect(() => {
    photoTemplateGroupsApi.list(true).then(setGroups).catch(() => setGroups([]));
  }, []);

  const group = groups.find((g) => String(g.id) === groupId);

  const upload = async (list: FileList | File[] | null) => {
    const files = Array.from(list ?? []).filter((f) => /^image\/(jpeg|png|webp)$/.test(f.type) || /\.(jpe?g|png|webp)$/i.test(f.name));
    if (files.length === 0) {
      if (list && list.length) error('Pilih file gambar (JPG, PNG, atau WEBP)');
      return;
    }
    let ok = 0;
    setProgress({ done: 0, total: files.length });
    for (const file of files) {
      try {
        const compressed = await compressImage(file);
        await clinicalPhotosApi.uploadForPatient(
          patientId,
          compressed.file,
          templateId ? Number(templateId) : undefined,
          compressed.originalSizeBytes,
        );
        ok += 1;
      } catch (err) {
        error(err instanceof ApiError ? err.message : `Gagal mengunggah ${file.name}`);
      }
      setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
    }
    setProgress(null);
    if (ok > 0) {
      success(ok === 1 ? 'Foto berhasil diunggah' : `${ok} foto berhasil diunggah`);
      onUploaded();
    }
  };

  return (
    <div
      className={`cp-uploader${over ? ' over' : ''}`}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault();
          setOver(true);
        }
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        setOver(false);
        if (e.dataTransfer.files.length) {
          e.preventDefault();
          void upload(e.dataTransfer.files);
        }
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        onChange={(e) => {
          void upload(e.target.files);
          e.target.value = '';
        }}
      />
      <button type="button" className="btn-outline" onClick={() => inputRef.current?.click()} disabled={!!progress}>
        <span aria-hidden="true" className="material-symbols-rounded">add_a_photo</span>
        {progress ? `Mengunggah ${progress.done}/${progress.total}…` : 'Unggah foto (bisa banyak sekaligus)'}
      </button>
      <div className="cp-uploader-where">
        <CustomSelect
          value={groupId}
          onChange={(v) => {
            setGroupId(v);
            setTemplateId('');
          }}
          options={[{ value: '', label: 'Foto bebas (tanpa folder)' }, ...groups.map((g) => ({ value: String(g.id), label: g.name }))]}
          placeholder="Folder"
        />
        {group && (
          <CustomSelect
            value={templateId}
            onChange={setTemplateId}
            options={[{ value: '', label: 'Tanpa slot' }, ...group.templates.map((t) => ({ value: String(t.id), label: t.name }))]}
            placeholder="Slot"
          />
        )}
      </div>
      <span className="cp-uploader-hint">Tidak perlu ada kunjungan. Seret foto ke sini juga bisa.</span>
    </div>
  );
}
