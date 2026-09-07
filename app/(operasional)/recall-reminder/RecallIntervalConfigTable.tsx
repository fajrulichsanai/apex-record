'use client';

import { useEffect, useState } from 'react';
import { ApiError } from '@/lib/api-client';
import { tarifApi, type Tarif } from '@/lib/tarif';
import { recallIntervalApi, type RecallInterval } from '@/lib/recall';
import { useToast } from '@/lib/toast-context';

interface RowState {
  tarif: Tarif;
  intervalDays: string;
  configured: boolean;
  saving: boolean;
}

interface RecallIntervalConfigTableProps {
  canEdit: boolean;
  onChanged?: () => void;
}

export default function RecallIntervalConfigTable({ canEdit, onChanged }: RecallIntervalConfigTableProps) {
  const { success, error } = useToast();
  const [rows, setRows] = useState<RowState[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const [tarifRes, intervals] = await Promise.all([tarifApi.list(), recallIntervalApi.list()]);
      const intervalByTarif = new Map<number, RecallInterval>(intervals.map((i) => [i.tarifId, i]));
      setRows(
        tarifRes.data.map((tarif) => {
          const interval = intervalByTarif.get(tarif.id);
          return {
            tarif,
            intervalDays: interval ? String(interval.intervalDays) : '',
            configured: !!interval,
            saving: false,
          };
        })
      );
    } catch (err) {
      error(err instanceof ApiError ? err.message : 'Gagal memuat konfigurasi interval recall');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateRow = (tarifId: number, patch: Partial<RowState>) => {
    setRows((prev) => prev.map((r) => (r.tarif.id === tarifId ? { ...r, ...patch } : r)));
  };

  const handleSave = async (row: RowState) => {
    const days = Number(row.intervalDays);
    if (!row.intervalDays || isNaN(days) || days < 1) {
      error('Interval hari tidak valid');
      return;
    }
    updateRow(row.tarif.id, { saving: true });
    try {
      await recallIntervalApi.upsert(row.tarif.id, days);
      success(`Interval recall untuk "${row.tarif.name}" telah disimpan`);
      updateRow(row.tarif.id, { configured: true });
      onChanged?.();
    } catch (err) {
      error(err instanceof ApiError ? err.message : 'Gagal menyimpan interval recall');
    } finally {
      updateRow(row.tarif.id, { saving: false });
    }
  };

  const handleRemove = async (row: RowState) => {
    updateRow(row.tarif.id, { saving: true });
    try {
      await recallIntervalApi.remove(row.tarif.id);
      success(`Recall otomatis untuk "${row.tarif.name}" dinonaktifkan`);
      updateRow(row.tarif.id, { configured: false, intervalDays: '' });
      onChanged?.();
    } catch (err) {
      error(err instanceof ApiError ? err.message : 'Gagal menonaktifkan interval recall');
    } finally {
      updateRow(row.tarif.id, { saving: false });
    }
  };

  if (loading) {
    return (
      <div className="empty-list">
        <div className="empty-icon-wrap">
          <span className="material-symbols-rounded">hourglass_empty</span>
        </div>
        <div className="empty-title">Memuat konfigurasi interval...</div>
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
    <div className="fee-table-wrap">
      <table className="fee-table">
        <thead>
          <tr>
            <th>Tindakan</th>
            <th>Interval Recall</th>
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
                <div className="fee-input-row">
                  <input
                    type="number"
                    min={1}
                    className="fee-value-input"
                    placeholder="mis. 180"
                    value={row.intervalDays}
                    onChange={(e) => updateRow(row.tarif.id, { intervalDays: e.target.value })}
                    disabled={!canEdit}
                  />
                  <span className="fee-suffix">hari</span>
                </div>
              </td>
              <td>
                {canEdit && (
                  <div className="row-actions">
                    <button type="button" className="btn-row-save" disabled={row.saving} onClick={() => handleSave(row)}>
                      {row.saving ? 'Menyimpan...' : 'Simpan'}
                    </button>
                    {row.configured && (
                      <button type="button" className="btn-row-save" disabled={row.saving} onClick={() => handleRemove(row)}>
                        Nonaktifkan
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
  );
}
