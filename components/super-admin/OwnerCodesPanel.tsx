'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { FiCopy } from 'react-icons/fi';
import { ownerCodeApi } from '@/lib/subscription';
import type { OwnerCode } from '@/types/subscription';
import { ApiError } from '@/lib/api-client';
import { useToast } from '@/lib/toast-context';
import { Modal, StatusBadge, TableState, Tabs, formatDateTime } from './ui';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I to avoid misreads
const MAX_ATTEMPTS_PER_CODE = 5;

function randomSuffix(length: number) {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return out;
}

/** Modal "Buat kode registrasi": kode sekali pakai untuk mendaftarkan owner klinik baru. */
export function GenerateCodesModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { success, error: showError } = useToast();
  const [prefix, setPrefix] = useState('APEX');
  const [count, setCount] = useState('1');
  const [generating, setGenerating] = useState(false);
  const [batch, setBatch] = useState<OwnerCode[] | null>(null);
  const cleanPrefix = prefix.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') || 'APEX';

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      success(`${label} disalin`);
    } catch {
      showError('Gagal menyalin');
    }
  };

  const generateOne = async (): Promise<OwnerCode> => {
    let lastErr: unknown;
    for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_CODE; attempt++) {
      try {
        return await ownerCodeApi.create(`${cleanPrefix}-${randomSuffix(6)}`.slice(0, 20));
      } catch (err) {
        lastErr = err;
        // Code already taken — try again with a fresh random suffix.
        if (err instanceof ApiError && err.code === 'OWNER_CODE_ALREADY_EXISTS') continue;
        throw err;
      }
    }
    throw lastErr;
  };

  const generate = async () => {
    const n = Math.min(50, Math.max(1, parseInt(count, 10) || 1));
    setGenerating(true);
    const created: OwnerCode[] = [];
    let failed = 0;
    for (let i = 0; i < n; i++) {
      try {
        created.push(await generateOne());
      } catch {
        failed++;
      }
    }
    setGenerating(false);
    setBatch(created);
    if (created.length > 0) {
      success(`${created.length} kode registrasi dibuat${failed > 0 ? `, ${failed} gagal` : ''}`);
      onCreated();
    } else {
      showError('Gagal membuat kode registrasi');
    }
  };

  return (
    <Modal
      title="Buat kode registrasi"
      onClose={onClose}
      busy={generating}
      footer={
        !batch ? (
          <>
            <button type="button" className="btn-outline" onClick={onClose} disabled={generating}>
              Batal
            </button>
            <button type="button" className="btn-primary" onClick={generate} disabled={generating}>
              {generating ? 'Membuat...' : 'Buat'}
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn-outline" onClick={onClose}>
              Tutup
            </button>
            {batch.length > 0 && (
              <button
                type="button"
                className="btn-primary"
                onClick={() => copy(batch.map((c) => c.code).join('\n'), 'Semua kode')}
              >
                Salin semua
              </button>
            )}
          </>
        )
      }
    >
      {!batch ? (
        <>
          <div className="sa-field">
            <label htmlFor="code-prefix">Awalan</label>
            <input id="code-prefix" type="text" value={prefix} maxLength={10} onChange={(e) => setPrefix(e.target.value)} />
          </div>
          <div className="sa-field">
            <label htmlFor="code-count">Jumlah kode</label>
            <input id="code-count" type="number" min={1} max={50} value={count} onChange={(e) => setCount(e.target.value)} />
          </div>
          <p className="text-sub">
            Format <strong>{cleanPrefix}-XXXXXX</strong>, maksimal 50 kode sekaligus. Bagikan satu kode ke satu calon
            owner klinik.
          </p>
        </>
      ) : batch.length === 0 ? (
        <p className="sa-notice sa-notice-bad">Gagal membuat kode. Coba lagi.</p>
      ) : (
        <ul className="code-list">
          {batch.map((c) => (
            <li key={c.id}>
              <span className="code-mono">{c.code}</span>
              <button type="button" className="btn-outline btn-sm" onClick={() => copy(c.code, `Kode ${c.code}`)}>
                <FiCopy /> Salin
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

type Filter = 'all' | 'unused' | 'used';

/** Tab "Kode registrasi" di halaman Klinik (PRD OC-01..03). */
export default function OwnerCodesPanel({ reloadKey = 0 }: { reloadKey?: number }) {
  const { success, error: showError } = useToast();
  const [codes, setCodes] = useState<OwnerCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('unused');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCodes(await ownerCodeApi.list());
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Gagal memuat kode registrasi');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    void load();
  }, [load, reloadKey]);

  const filtered = useMemo(
    () =>
      codes.filter(
        (c) =>
          (filter === 'all' || (filter === 'used' ? c.isUsed : !c.isUsed)) &&
          (!search || c.code.toLowerCase().includes(search.toLowerCase())),
      ),
    [codes, filter, search],
  );

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      success(`Kode ${code} disalin`);
    } catch {
      showError('Gagal menyalin kode');
    }
  };

  return (
    <>
      <div className="filter-bar">
        <Tabs
          active={filter}
          onChange={(k) => setFilter(k as Filter)}
          tabs={[
            { key: 'all', label: `Semua (${codes.length})` },
            { key: 'unused', label: `Belum dipakai (${codes.filter((c) => !c.isUsed).length})` },
            { key: 'used', label: `Sudah dipakai (${codes.filter((c) => c.isUsed).length})` },
          ]}
        />
        <input
          type="search"
          className="search-input"
          placeholder="Cari kode..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Cari kode"
        />
      </div>
      <div className="table-wrap">
        <table className="sa-table">
          <thead>
            <tr>
              <th>Kode</th>
              <th>Status</th>
              <th>Dibuat</th>
              <th>Dipakai oleh</th>
              <th>Klinik</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <TableState
              loading={loading}
              empty={filtered.length === 0}
              colSpan={6}
              message={codes.length === 0 ? 'Belum ada kode registrasi.' : 'Tidak ada kode untuk filter ini.'}
            />
            {!loading &&
              filtered.map((c) => (
                <tr key={c.id}>
                  <td className="code-mono">{c.code}</td>
                  <td>
                    <StatusBadge tone={c.isUsed ? 'neutral' : 'ok'}>{c.isUsed ? 'Terpakai' : 'Belum dipakai'}</StatusBadge>
                  </td>
                  <td className="col-time">{formatDateTime(c.createdAt)}</td>
                  <td>
                    {c.usedBy ? (
                      <>
                        {c.usedByName ?? `User #${c.usedBy}`}
                        <span className="cell-sub">{c.usedByEmail ?? ''} · {formatDateTime(c.usedAt)}</span>
                      </>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td>
                    {c.clinicId ? <Link href={`/super-admin/clinics/${c.clinicId}`}>{c.clinicName ?? `Klinik #${c.clinicId}`}</Link> : '-'}
                  </td>
                  <td>
                    {!c.isUsed && (
                      <button type="button" className="btn-outline btn-sm" onClick={() => copy(c.code)}>
                        <FiCopy /> Salin
                      </button>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
