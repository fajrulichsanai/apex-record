'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import CustomSelect from '@/components/form/CustomSelect';
import ConfirmationModal from '@/components/feedback/ConfirmationModal';
import { apiFileUrl, ApiError } from '@/lib/api-client';
import { supportingExamApi, type SupportingExamImage, type SupportingExamImageType } from '@/lib/supporting-exam';
import { useToast } from '@/lib/toast-context';

interface SupportingExamPanelProps {
  encounterId: number;
}

const TYPE_OPTIONS = [
  { value: 'photo', label: 'Foto' },
  { value: 'xray', label: 'Rontgen' },
];

function typeLabel(type: SupportingExamImageType) {
  return type === 'xray' ? 'Rontgen' : 'Foto';
}

/**
 * Pemeriksaan Penunjang — a simple photo/rontgen gallery per encounter, kept
 * separate from Rekam Medis's other tabs since it's a plain list of uploaded
 * images rather than a structured clinical form.
 */
export default function SupportingExamPanel({ encounterId }: SupportingExamPanelProps) {
  const { success, error } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [images, setImages] = useState<SupportingExamImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageType, setImageType] = useState<string>('photo');
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [viewImage, setViewImage] = useState<SupportingExamImage | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: number; name: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await supportingExamApi.list(encounterId);
      setImages(data);
    } catch (err) {
      error(err instanceof ApiError ? err.message : 'Gagal memuat gambar pemeriksaan penunjang');
    } finally {
      setLoading(false);
    }
  }, [encounterId, error]);

  useEffect(() => {
    load();
  }, [load]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(e.target.files?.[0] || null);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    try {
      setUploading(true);
      await supportingExamApi.upload(encounterId, selectedFile, imageType as SupportingExamImageType, notes.trim() || undefined);
      success('Gambar berhasil diunggah');
      setSelectedFile(null);
      setNotes('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      await load();
    } catch (err) {
      error(err instanceof ApiError ? err.message : 'Gagal mengunggah gambar');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await supportingExamApi.remove(encounterId, confirmDelete.id);
      success('Gambar berhasil dihapus');
      setConfirmDelete(null);
      await load();
    } catch (err) {
      error(err instanceof ApiError ? err.message : 'Gagal menghapus gambar');
    }
  };

  return (
    <div className="rx-panel">
      <div className="rx-add-row">
        <div className="se-upload-fields">
          <div className="visit-form-field">
            <label>Jenis Gambar</label>
            <CustomSelect value={imageType} onChange={setImageType} options={TYPE_OPTIONS} disabled={uploading} />
          </div>
          <div className="visit-form-field">
            <label>File Gambar</label>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} disabled={uploading} />
          </div>
          <div className="visit-form-field se-upload-notes">
            <label>Catatan</label>
            <input
              type="text"
              placeholder="Catatan (opsional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={uploading}
            />
          </div>
        </div>
        <button type="button" className="btn-outline rx-add-btn" onClick={handleUpload} disabled={uploading || !selectedFile}>
          <span className="material-symbols-rounded">upload</span>
          {uploading ? 'Mengunggah…' : 'Unggah Gambar'}
        </button>
      </div>

      {loading ? (
        <div className="rx-empty">Memuat gambar…</div>
      ) : images.length === 0 ? (
        <div className="rx-empty">
          <span className="material-symbols-rounded">image</span>
          Belum ada gambar pemeriksaan penunjang
        </div>
      ) : (
        <div className="se-gallery">
          {images.map((img) => (
            <div key={img.id} className="se-gallery-item">
              <button type="button" className="se-gallery-thumb" onClick={() => setViewImage(img)}>
                {/* eslint-disable-next-line @next/next/no-img-element -- backend-hosted upload, not a Next-optimizable static asset */}
                <img src={apiFileUrl(img.fileUrl)} alt={img.originalName || typeLabel(img.imageType)} />
                <span className={`se-badge se-badge-${img.imageType}`}>{typeLabel(img.imageType)}</span>
              </button>
              {img.notes && <p className="se-gallery-caption">{img.notes}</p>}
              <button
                type="button"
                className="rx-delete-btn se-gallery-delete"
                aria-label="Hapus"
                onClick={() => setConfirmDelete({ id: img.id, name: img.originalName || typeLabel(img.imageType) })}
              >
                <span className="material-symbols-rounded">delete</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {viewImage && (
        <div className="visit-modal-overlay" onClick={() => setViewImage(null)}>
          <div className="visit-modal-box se-lightbox-box" onClick={(e) => e.stopPropagation()}>
            <div className="visit-modal-header">
              <div>
                <h2>{typeLabel(viewImage.imageType)}</h2>
                {viewImage.notes && <p>{viewImage.notes}</p>}
              </div>
              <button type="button" className="visit-modal-close" onClick={() => setViewImage(null)}>
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element -- backend-hosted upload, not a Next-optimizable static asset */}
            <img src={apiFileUrl(viewImage.fileUrl)} alt={viewImage.originalName || typeLabel(viewImage.imageType)} className="se-lightbox-img" />
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!confirmDelete}
        title="Hapus Gambar?"
        message={`Apakah Anda yakin ingin menghapus "${confirmDelete?.name}"?`}
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        isDangerous
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
