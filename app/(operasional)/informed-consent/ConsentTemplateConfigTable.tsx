'use client';

import { useEffect, useState } from 'react';
import { ApiError } from '@/lib/api-client';
import { tarifApi, type Tarif } from '@/lib/tarif';
import { consentTemplateApi, type ConsentTemplate } from '@/lib/consent';
import { useToast } from '@/lib/toast-context';

interface RowState {
  tarif: Tarif;
  template: ConsentTemplate | null;
}

interface ConsentTemplateConfigTableProps {
  canEdit: boolean;
}

export default function ConsentTemplateConfigTable({ canEdit }: ConsentTemplateConfigTableProps) {
  const { success, error } = useToast();
  const [rows, setRows] = useState<RowState[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<RowState | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const [tarifRes, templates] = await Promise.all([tarifApi.list(), consentTemplateApi.list()]);
      const templateByTarif = new Map<number, ConsentTemplate>(templates.map((t) => [t.tarifId, t]));
      setRows(
        tarifRes.data.map((tarif) => ({
          tarif,
          template: templateByTarif.get(tarif.id) ?? null,
        }))
      );
    } catch (err) {
      error(err instanceof ApiError ? err.message : 'Gagal memuat template consent');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openEdit = (row: RowState) => {
    setEditing(row);
    setTitle(row.template?.title || `Persetujuan Tindakan ${row.tarif.name}`);
    setContent(row.template?.content || '');
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!title.trim() || !content.trim()) {
      error('Judul dan isi persetujuan wajib diisi');
      return;
    }
    setSaving(true);
    try {
      await consentTemplateApi.upsert(editing.tarif.id, { title: title.trim(), content: content.trim() });
      success(`Template consent untuk "${editing.tarif.name}" telah disimpan`);
      setEditing(null);
      load();
    } catch (err) {
      error(err instanceof ApiError ? err.message : 'Gagal menyimpan template consent');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (row: RowState) => {
    if (!row.template) return;
    try {
      await consentTemplateApi.remove(row.tarif.id);
      success(`Template consent untuk "${row.tarif.name}" dihapus`);
      load();
    } catch (err) {
      error(err instanceof ApiError ? err.message : 'Gagal menghapus template consent');
    }
  };

  if (loading) {
    return (
      <div className="empty-list">
        <div className="empty-icon-wrap">
          <span className="material-symbols-rounded">hourglass_empty</span>
        </div>
        <div className="empty-title">Memuat template consent...</div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="empty-list">
        <div className="empty-icon-wrap">
          <span className="material-symbols-rounded">search_off</span>
        </div>
        <div className="empty-title">Belum ada tindakan/tarif terdaftar</div>
        <div className="empty-sub">Tambahkan tarif terlebih dahulu di halaman Tarif &amp; Tindakan</div>
      </div>
    );
  }

  return (
    <>
      <div className="fee-table-wrap">
        <table className="fee-table">
          <thead>
            <tr>
              <th>Tindakan</th>
              <th>Status Template</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.tarif.id}>
                <td>
                  <div className="tarif-name">{row.tarif.name}</div>
                  <div className="tarif-kategori">{row.tarif.kategori}</div>
                </td>
                <td>
                  {row.template ? (
                    <span className="tag tag-completed">Template tersedia</span>
                  ) : (
                    <span className="tag tag-draft">Belum diatur</span>
                  )}
                </td>
                <td>
                  {canEdit && (
                    <div className="row-actions">
                      <button type="button" className="btn-row-save" onClick={() => openEdit(row)}>
                        {row.template ? 'Edit' : 'Buat Template'}
                      </button>
                      {row.template && (
                        <button type="button" className="btn-row-save" onClick={() => handleRemove(row)}>
                          Hapus
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="consent-modal-overlay" onClick={() => !saving && setEditing(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-title">
                <div className="modal-header-icon">
                  <span className="material-symbols-rounded">description</span>
                </div>
                <div>
                  <h2>Template Persetujuan</h2>
                  <p>{editing.tarif.name}</p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setEditing(null)} aria-label="Tutup">
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-field">
                <label>Judul Formulir</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="form-field">
                <label>Isi Teks Persetujuan</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Jelaskan tindakan, risiko, dan persetujuan pasien. Pisahkan paragraf dengan baris kosong."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-outline" onClick={() => setEditing(null)} disabled={saving}>
                Batal
              </button>
              <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Menyimpan...' : 'Simpan Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
