'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import SuperAdminLayout from '@/components/layout/SuperAdminLayout';
import CustomSelect from '@/components/form/CustomSelect';
import { ownerCodeApi } from '@/lib/subscription';
import type { OwnerCode } from '@/types/subscription';
import { ApiError } from '@/lib/api-client';
import { useToast } from '@/lib/toast-context';
import { FiCopy } from 'react-icons/fi';
import '../../styles/super-admin.css';

const STATUS_OPTIONS = [
  { value: 'all', label: 'Semua Status' },
  { value: 'unused', label: 'Belum Digunakan' },
  { value: 'used', label: 'Sudah Digunakan' },
];

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I to avoid misreads
const MAX_ATTEMPTS_PER_CODE = 5;

function randomSuffix(length: number) {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return out;
}

function formatDateTime(value: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function SuperAdminOwnerCodesPage() {
  const [codes, setCodes] = useState<OwnerCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { success, error: showError } = useToast();

  const [genModalOpen, setGenModalOpen] = useState(false);
  const [genPrefix, setGenPrefix] = useState('APEX');
  const [genCount, setGenCount] = useState('1');
  const [generating, setGenerating] = useState(false);
  const [generatedBatch, setGeneratedBatch] = useState<OwnerCode[] | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCodes(await ownerCodeApi.list());
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Gagal memuat daftar owner code');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    return codes.filter((c) => {
      if (statusFilter === 'unused' && c.isUsed) return false;
      if (statusFilter === 'used' && !c.isUsed) return false;
      if (search && !c.code.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [codes, statusFilter, search]);

  const stats = useMemo(() => ({
    total: codes.length,
    unused: codes.filter((c) => !c.isUsed).length,
    used: codes.filter((c) => c.isUsed).length,
  }), [codes]);

  const openGenerateModal = () => {
    setGenPrefix('APEX');
    setGenCount('1');
    setGeneratedBatch(null);
    setGenModalOpen(true);
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      success(`Kode ${code} disalin ke clipboard`);
    } catch {
      showError('Gagal menyalin kode');
    }
  };

  const copyBatch = async (batch: OwnerCode[]) => {
    try {
      await navigator.clipboard.writeText(batch.map((c) => c.code).join('\n'));
      success('Semua kode disalin ke clipboard');
    } catch {
      showError('Gagal menyalin kode');
    }
  };

  const generateOneCode = async (prefix: string): Promise<OwnerCode> => {
    let lastErr: unknown;
    for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_CODE; attempt++) {
      const candidate = `${prefix}-${randomSuffix(6)}`.slice(0, 20);
      try {
        return await ownerCodeApi.create(candidate);
      } catch (err) {
        lastErr = err;
        // Code already taken — try again with a fresh random suffix.
        if (err instanceof ApiError && err.code === 'OWNER_CODE_ALREADY_EXISTS') continue;
        throw err;
      }
    }
    throw lastErr;
  };

  const handleGenerate = async () => {
    const prefix = genPrefix.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') || 'APEX';
    const count = Math.min(50, Math.max(1, parseInt(genCount, 10) || 1));

    setGenerating(true);
    const created: OwnerCode[] = [];
    let failed = 0;
    for (let i = 0; i < count; i++) {
      try {
        created.push(await generateOneCode(prefix));
      } catch {
        failed++;
      }
    }
    setGenerating(false);
    setGeneratedBatch(created);

    if (created.length > 0) {
      success(`${created.length} owner code berhasil dibuat${failed > 0 ? `, ${failed} gagal` : ''}`);
      load();
    } else {
      showError('Gagal membuat owner code');
    }
  };

  return (
    <SuperAdminLayout>
      <div className="sa-page">
        <div className="page-header">
          <div className="page-title-block">
            <div className="page-title">
              <h1>Owner Code</h1>
              <span className="badge-count">{stats.total}</span>
            </div>
            <p className="page-subtitle">
              Kode unik sekali pakai untuk pendaftaran akun Owner klinik baru. Bagikan satu kode ke satu calon Owner.
            </p>
          </div>
          <button type="button" className="btn-primary" onClick={openGenerateModal}>
            + Generate Owner Code
          </button>
        </div>

        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-card-label">Total Kode</div>
            <div className="stat-card-value">{stats.total}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Belum Digunakan</div>
            <div className="stat-card-value" style={{ color: 'var(--green)' }}>{stats.unused}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Sudah Digunakan</div>
            <div className="stat-card-value" style={{ color: 'var(--text-sub)' }}>{stats.used}</div>
          </div>
        </div>

        <div className="filter-bar">
          <input
            type="text"
            className="search-input"
            placeholder="Cari kode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="filter-select">
            <CustomSelect value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} placeholder="Status" />
          </div>
        </div>

        <div className="table-wrap">
          <table className="sa-table">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Status</th>
                <th>Dibuat</th>
                <th>Digunakan Oleh</th>
                <th>Digunakan Pada</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="empty-row">Memuat...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="empty-row">
                  {codes.length === 0 ? 'Belum ada owner code. Klik "Generate Owner Code" untuk membuat.' : 'Tidak ada kode yang cocok dengan filter ini.'}
                </td></tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600, fontFamily: 'monospace', letterSpacing: 0.5 }}>{c.code}</td>
                    <td>
                      <span className={`tag ${c.isUsed ? 'tag-neutral' : 'tag-active'}`}>
                        {c.isUsed ? 'Terpakai' : 'Aktif'}
                      </span>
                    </td>
                    <td className="col-time">{formatDateTime(c.createdAt)}</td>
                    <td>{c.usedBy ? `User #${c.usedBy}` : '-'}</td>
                    <td className="col-time">{formatDateTime(c.usedAt)}</td>
                    <td>
                      <button type="button" className="btn-outline btn-sm" onClick={() => copyCode(c.code)} title="Salin kode">
                        <FiCopy /> Salin
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {genModalOpen && (
        <div className="sa-modal-overlay" onClick={() => !generating && setGenModalOpen(false)}>
          <div className="sa-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sa-modal-header">
              <h2>Generate Owner Code</h2>
              <button type="button" className="sa-modal-close" onClick={() => setGenModalOpen(false)} disabled={generating}>&times;</button>
            </div>

            {!generatedBatch ? (
              <>
                <div className="sa-modal-body">
                  <div className="sa-field">
                    <label>Prefix</label>
                    <input
                      type="text"
                      value={genPrefix}
                      onChange={(e) => setGenPrefix(e.target.value)}
                      placeholder="APEX"
                      maxLength={10}
                    />
                  </div>
                  <div className="sa-field">
                    <label>Jumlah Kode</label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={genCount}
                      onChange={(e) => setGenCount(e.target.value)}
                    />
                  </div>
                  <p style={{ fontSize: 12.5, color: 'var(--text-sub)' }}>
                    Kode dibuat otomatis dengan format <strong>{(genPrefix.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') || 'APEX')}-XXXXXX</strong>. Maksimal 50 kode sekaligus.
                  </p>
                </div>
                <div className="sa-modal-footer">
                  <button type="button" className="btn-outline" onClick={() => setGenModalOpen(false)} disabled={generating}>Batal</button>
                  <button type="button" className="btn-primary" onClick={handleGenerate} disabled={generating}>
                    {generating ? 'Membuat...' : 'Generate'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="sa-modal-body">
                  {generatedBatch.length === 0 ? (
                    <p style={{ fontSize: 13.5, color: 'var(--red)' }}>Gagal membuat owner code. Coba lagi.</p>
                  ) : (
                    <>
                      <p style={{ fontSize: 13.5, color: 'var(--text-sub)' }}>
                        {generatedBatch.length} kode berhasil dibuat. Bagikan satu kode ke satu calon Owner.
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
                        {generatedBatch.map((c) => (
                          <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1.5px solid var(--border)', borderRadius: 8, padding: '8px 12px' }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 600, letterSpacing: 0.5 }}>{c.code}</span>
                            <button type="button" className="btn-outline btn-sm" onClick={() => copyCode(c.code)}>
                              <FiCopy /> Salin
                            </button>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <div className="sa-modal-footer">
                  <button type="button" className="btn-outline" onClick={() => setGenModalOpen(false)}>Tutup</button>
                  {generatedBatch.length > 0 && (
                    <button type="button" className="btn-primary" onClick={() => copyBatch(generatedBatch)}>
                      Salin Semua
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </SuperAdminLayout>
  );
}
