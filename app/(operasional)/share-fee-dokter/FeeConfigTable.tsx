'use client';

import { useEffect, useState } from 'react';
import CustomSelect from '@/components/form/CustomSelect';
import { ApiError } from '@/lib/api-client';
import { tarifApi, type Tarif } from '@/lib/tarif';
import { doctorFeeApi, type DoctorFeeConfig, type FeeType } from '@/lib/doctor-fee';
import { useToast } from '@/lib/toast-context';

interface RowState {
  tarif: Tarif;
  feeType: FeeType;
  feeValue: string;
  isActive: boolean;
  saving: boolean;
}

const FEE_TYPE_OPTIONS = [
  { value: 'fixed', label: 'Fixed (Rp)' },
  { value: 'percentage', label: 'Persentase (%)' },
];

interface FeeConfigTableProps {
  onChanged?: () => void;
}

export default function FeeConfigTable({ onChanged }: FeeConfigTableProps) {
  const { success, error } = useToast();
  const [rows, setRows] = useState<RowState[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const [tarifRes, configs] = await Promise.all([tarifApi.list(), doctorFeeApi.listConfigs()]);
      const configByTarif = new Map<number, DoctorFeeConfig>(configs.map((c) => [c.tarifId, c]));
      setRows(
        tarifRes.data.map((tarif) => {
          const config = configByTarif.get(tarif.id);
          return {
            tarif,
            feeType: config?.feeType ?? 'percentage',
            feeValue: config ? String(config.feeValue) : '0',
            isActive: config?.isActive ?? true,
            saving: false,
          };
        })
      );
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Gagal memuat konfigurasi fee';
      error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateRow = (tarifId: number, patch: Partial<RowState>) => {
    setRows((prev) => prev.map((r) => (r.tarif.id === tarifId ? { ...r, ...patch } : r)));
  };

  const handleSave = async (row: RowState) => {
    const feeValueNum = Number(row.feeValue);
    if (isNaN(feeValueNum) || feeValueNum < 0) {
      error('Nilai fee tidak valid');
      return;
    }

    updateRow(row.tarif.id, { saving: true });
    try {
      await doctorFeeApi.upsertConfig({
        tarifId: row.tarif.id,
        feeType: row.feeType,
        feeValue: feeValueNum,
        isActive: row.isActive,
      });
      success(`Fee untuk "${row.tarif.name}" telah disimpan`);
      onChanged?.();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Gagal menyimpan konfigurasi fee';
      error(message);
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
        <div className="empty-title">Memuat konfigurasi fee...</div>
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
        <div className="empty-sub">Tambahkan tarif terlebih dahulu di halaman Tarif & Tindakan</div>
      </div>
    );
  }

  return (
    <div className="fee-table-wrap">
      <table className="fee-table">
        <thead>
          <tr>
            <th>Tindakan</th>
            <th>Harga Jual</th>
            <th>Tipe Fee</th>
            <th>Nilai Fee</th>
            <th>Aktif</th>
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
              <td>Rp {(row.tarif.hargaJual || 0).toLocaleString('id-ID')}</td>
              <td style={{ minWidth: 160 }}>
                <CustomSelect
                  value={row.feeType}
                  onChange={(v) => updateRow(row.tarif.id, { feeType: v as FeeType })}
                  options={FEE_TYPE_OPTIONS}
                />
              </td>
              <td>
                <div className="fee-input-row">
                  <input
                    type="number"
                    min={0}
                    className="fee-value-input"
                    value={row.feeValue}
                    onChange={(e) => updateRow(row.tarif.id, { feeValue: e.target.value })}
                  />
                  <span className="fee-suffix">{row.feeType === 'fixed' ? 'Rp' : '%'}</span>
                </div>
              </td>
              <td>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={row.isActive}
                    onChange={(e) => updateRow(row.tarif.id, { isActive: e.target.checked })}
                  />
                  <span className="toggle-slider" />
                </label>
              </td>
              <td>
                <button
                  type="button"
                  className="btn-row-save"
                  disabled={row.saving}
                  onClick={() => handleSave(row)}
                >
                  {row.saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
