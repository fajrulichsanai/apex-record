'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import CustomSelect from '@/components/form/CustomSelect';
import ConfirmationModal from '@/components/feedback/ConfirmationModal';
import { fetchProtectedFileUrl, ApiError } from '@/lib/api-client';
import {
  clinicalPhotosApi,
  photoTemplateGroupsApi,
  type PatientPhoto,
  type PhotoTemplateGroup,
} from '@/lib/clinical-photos';
import { compressImage, formatBytesShort, savingsPct } from '@/lib/image-compress';
import { useToast } from '@/lib/toast-context';
import { useEscapeKey } from '@/lib/a11y';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';

interface ClinicalPhotosPanelProps {
  encounterId: number;
}

/**
 * Folder & template foto klinis (PRD: Template Foto Pasien & Manajemen
 * Konten) — pilih folder (bawaan "Behel" atau buatan klinik), isi slot
 * kosongnya satu per satu; progres per slot terlihat supaya jelas apa yang
 * masih kurang. Foto tersimpan ke rekam medis pasien, lintas kontrol.
 */
export default function ClinicalPhotosPanel({ encounterId }: ClinicalPhotosPanelProps) {
  const { success, error } = useToast();
  const { user } = useAuth();
  const canManageFolders = user?.role === 'owner' || user?.role === 'admin' || user?.role === 'manajer_cabang';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingTemplateId, setPendingTemplateId] = useState<number | null>(null);

  const [groups, setGroups] = useState<PhotoTemplateGroup[]>([]);
  const [groupId, setGroupId] = useState<number | ''>('');
  const [photos, setPhotos] = useState<PatientPhoto[]>([]);
  const [imageUrls, setImageUrls] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [savingLog, setSavingLog] = useState<{ name: string; original: number; compressed: number }[]>([]);
  const [viewPhoto, setViewPhoto] = useState<PatientPhoto | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: number; label: string } | null>(null);
  useEscapeKey(() => setViewPhoto(null), viewPhoto !== null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [groupData, photoData] = await Promise.all([
        photoTemplateGroupsApi.list(true),
        clinicalPhotosApi.listByEncounter(encounterId),
      ]);
      setGroups(groupData);
      setPhotos(photoData);
      setGroupId((prev) => (prev && groupData.some((g) => g.id === prev) ? prev : (groupData[0]?.id ?? '')));
    } catch (err) {
      error(err instanceof ApiError ? err.message : 'Gagal memuat folder foto klinis');
    } finally {
      setLoading(false);
    }
  }, [encounterId, error]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    const createdUrls: string[] = [];
    (async () => {
      const entries = await Promise.all(
        photos.map(async (p) => {
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
      setImageUrls(Object.fromEntries(entries.filter((e): e is readonly [number, string] => e !== null)));
    })();
    return () => {
      cancelled = true;
      createdUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [photos]);

  const activeGroup = groups.find((g) => g.id === groupId) || null;
  const photosByTemplate = new Map<number, PatientPhoto>();
  const freePhotos: PatientPhoto[] = [];
  for (const p of photos) {
    if (p.templateId) photosByTemplate.set(p.templateId, p);
    else freePhotos.push(p);
  }

  const openPicker = (templateId: number | null) => {
    setPendingTemplateId(templateId);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setUploading(true);
      const compressed = await compressImage(file);
      await clinicalPhotosApi.upload(
        encounterId,
        compressed.file,
        pendingTemplateId ?? undefined,
        compressed.originalSizeBytes,
      );
      setSavingLog((prev) => [
        ...prev,
        { name: file.name, original: compressed.originalSizeBytes, compressed: compressed.compressedSizeBytes },
      ]);
      success('Foto berhasil diunggah');
      await load();
    } catch (err) {
      error(err instanceof ApiError ? err.message : 'Gagal mengunggah foto');
    } finally {
      setUploading(false);
      setPendingTemplateId(null);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await clinicalPhotosApi.remove(encounterId, confirmDelete.id);
      success('Foto berhasil dihapus');
      setConfirmDelete(null);
      await load();
    } catch (err) {
      error(err instanceof ApiError ? err.message : 'Gagal menghapus foto');
    }
  };

  const filledCount = activeGroup?.templates.filter((t) => photosByTemplate.has(t.id)).length ?? 0;

  return (
    <div className="rx-panel">
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={handleFileChange} />

      <div className="rx-add-row">
        <div className="visit-form-field" style={{ minWidth: 220 }}>
          <label>Folder foto klinis</label>
          <CustomSelect
            value={String(groupId)}
            onChange={(v) => setGroupId(v ? Number(v) : '')}
            options={groups.map((g) => ({ value: String(g.id), label: g.name }))}
            disabled={loading || groups.length === 0}
          />
        </div>
        {activeGroup && (
          <span className="cp-progress">
            {filledCount}/{activeGroup.templates.length} slot terisi
          </span>
        )}
        {canManageFolders && (
          <Link href="/folder-foto-klinis" className="btn-outline rx-add-btn" style={{ textDecoration: 'none' }}>
            <span aria-hidden="true" className="material-symbols-rounded">tune</span>
            Kelola Folder
          </Link>
        )}
        <button
          type="button"
          className="btn-outline rx-add-btn"
          onClick={() => openPicker(null)}
          disabled={uploading}
        >
          <span aria-hidden="true" className="material-symbols-rounded">add_a_photo</span>
          Unggah foto bebas
        </button>
      </div>

      {savingLog.some((s) => s.compressed < s.original) && (
        <ul className="cp-saving-log">
          {savingLog
            .filter((s) => s.compressed < s.original)
            .map((s, i) => (
              <li key={i} className="cp-saving-hint">
                {s.name}: {formatBytesShort(s.original)} → {formatBytesShort(s.compressed)}{' '}
                (hemat {savingsPct(s.original, s.compressed)}%)
              </li>
            ))}
        </ul>
      )}

      {loading ? (
        <div className="rx-empty">Memuat folder…</div>
      ) : !activeGroup ? (
        <div className="rx-empty">
          <span aria-hidden="true" className="material-symbols-rounded">folder_off</span>
          Belum ada folder foto klinis aktif untuk klinik ini
        </div>
      ) : (
        <div className="cp-slot-grid">
          {activeGroup.templates.map((t) => {
            const photo = photosByTemplate.get(t.id);
            return (
              <div key={t.id} className={`cp-slot${photo ? ' cp-slot-filled' : ''}`}>
                {photo ? (
                  <button type="button" className="cp-slot-thumb" onClick={() => setViewPhoto(photo)}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- backend-hosted upload */}
                    <img src={imageUrls[photo.id]} alt={t.name} />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="cp-slot-empty"
                    onClick={() => openPicker(t.id)}
                    disabled={uploading}
                  >
                    <span aria-hidden="true" className="material-symbols-rounded">add_a_photo</span>
                  </button>
                )}
                <p className="cp-slot-label">{t.name}</p>
                {photo && (
                  <button
                    type="button"
                    className="rx-delete-btn cp-slot-delete"
                    aria-label="Hapus"
                    onClick={() => setConfirmDelete({ id: photo.id, label: t.name })}
                  >
                    <span aria-hidden="true" className="material-symbols-rounded">delete</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {freePhotos.length > 0 && (
        <>
          <h3 className="rm-subheading">Foto bebas (di luar template)</h3>
          <div className="cp-slot-grid">
            {freePhotos.map((photo) => (
              <div key={photo.id} className="cp-slot cp-slot-filled">
                <button type="button" className="cp-slot-thumb" onClick={() => setViewPhoto(photo)}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- backend-hosted upload */}
                  <img src={imageUrls[photo.id]} alt={photo.originalName || 'Foto'} />
                </button>
                <button
                  type="button"
                  className="rx-delete-btn cp-slot-delete"
                  aria-label="Hapus"
                  onClick={() => setConfirmDelete({ id: photo.id, label: photo.originalName || 'Foto' })}
                >
                  <span aria-hidden="true" className="material-symbols-rounded">delete</span>
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {viewPhoto && (
        <div className="visit-modal-overlay" onClick={() => setViewPhoto(null)}>
          <div className="visit-modal-box se-lightbox-box" onClick={(e) => e.stopPropagation()}>
            <div className="visit-modal-header">
              <h2>{viewPhoto.template?.name || viewPhoto.originalName || 'Foto'}</h2>
              <button aria-label="Tutup" type="button" className="visit-modal-close" onClick={() => setViewPhoto(null)}>
                <span aria-hidden="true" className="material-symbols-rounded">close</span>
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element -- backend-hosted upload */}
            <img src={imageUrls[viewPhoto.id]} alt="" className="se-lightbox-img" />
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!confirmDelete}
        title="Hapus Foto?"
        message={`Apakah Anda yakin ingin menghapus foto "${confirmDelete?.label}"?`}
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        isDangerous
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
