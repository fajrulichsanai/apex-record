'use client';

import { useState } from 'react';
import Link from 'next/link';
import { patientsApi, type SatusehatPatientQuery, type SatusehatPatientResult } from '@/lib/patients';
import { useToast } from '@/lib/toast-context';
import './SatusehatPatientSearch.css';

type Mode = 'nik' | 'nama' | 'bayi' | 'id';

export interface SatusehatPatientPick {
  name: string;
  gender: 'laki-laki' | 'perempuan' | null;
  birthDate: string;
  /** NIK yang diketik petugas (SATUSEHAT hanya mengembalikan NIK tersamar) */
  nik: string;
  nikIbu: string;
  phone: string;
  address: string;
}

const MODES: { key: Mode; label: string; sub: string }[] = [
  { key: 'nik', label: 'NIK', sub: '16 digit KTP' },
  { key: 'nama', label: 'Nama', sub: 'Nama + tgl lahir + JK' },
  { key: 'bayi', label: 'Bayi baru lahir', sub: 'NIK ibu' },
  { key: 'id', label: 'ID SATUSEHAT', sub: 'mis. P02478375538' },
];

const digits = (v: string) => v.replace(/\D/g, '').slice(0, 16);
const errText = (err: unknown) => (err instanceof Error && err.message ? err.message : 'Gagal mencari di SATUSEHAT');

/**
 * Cari pasien di SATUSEHAT sebelum mendaftar — data resmi (nama, JK, tanggal
 * lahir) langsung mengisi form, sisanya dilengkapi sesuai kebutuhan klinik.
 */
export default function SatusehatPatientSearch({ onUse }: { onUse: (pick: SatusehatPatientPick) => void }) {
  const { error: showError } = useToast();
  const [open, setOpen] = useState(true);
  const [mode, setMode] = useState<Mode>('nik');
  const [q, setQ] = useState({ nik: '', name: '', birthDate: '', gender: '' as '' | 'male' | 'female', nikIbu: '', ihsId: '' });
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<SatusehatPatientResult[] | null>(null);
  const [used, setUsed] = useState<string | null>(null);

  const ready =
    mode === 'nik'
      ? q.nik.length === 16
      : mode === 'bayi'
        ? q.nikIbu.length === 16
        : mode === 'id'
          ? q.ihsId.trim().length >= 3
          : q.name.trim().length >= 2 && !!q.birthDate && !!q.gender;

  async function search() {
    if (!ready || busy) return;
    setBusy(true);
    setResults(null);
    try {
      const body: SatusehatPatientQuery =
        mode === 'nik'
          ? { nik: q.nik }
          : mode === 'bayi'
            ? { nikIbu: q.nikIbu }
            : mode === 'id'
              ? { ihsId: q.ihsId.trim() }
              : { name: q.name.trim(), birthDate: q.birthDate, gender: q.gender || undefined };
      const r = await patientsApi.searchSatusehat(body);
      setResults(r.results ?? []);
    } catch (err) {
      showError(errText(err));
    } finally {
      setBusy(false);
    }
  }

  function use(r: SatusehatPatientResult) {
    onUse({
      name: r.name ?? '',
      gender: r.gender === 'male' ? 'laki-laki' : r.gender === 'female' ? 'perempuan' : null,
      birthDate: r.birthDate ?? '',
      nik: mode === 'nik' ? q.nik : '',
      nikIbu: mode === 'bayi' ? q.nikIbu : '',
      phone: r.phone ?? '',
      address: r.address ?? '',
    });
    setUsed(r.id);
    setOpen(false);
  }

  if (!open) {
    return (
      <div className="ssp ssp-collapsed">
        <span>
          {used ? '✓ Data diisi dari SATUSEHAT — lengkapi sisanya di bawah.' : 'Pasien tidak dicari di SATUSEHAT.'}
        </span>
        <button type="button" className="ssp-link" onClick={() => setOpen(true)}>
          Cari lagi
        </button>
      </div>
    );
  }

  return (
    <div className="ssp">
      <div className="ssp-head">
        <div>
          <strong>Cari pasien di SATUSEHAT</strong>
          <span>Disarankan sebelum mendaftar — nama, jenis kelamin & tanggal lahir terisi sesuai data resmi.</span>
        </div>
        <button type="button" className="ssp-link" onClick={() => setOpen(false)}>
          Lewati
        </button>
      </div>

      <div className="ssp-modes" role="tablist" aria-label="Metode pencarian SATUSEHAT">
        {MODES.map((m) => (
          <button
            key={m.key}
            type="button"
            role="tab"
            aria-selected={mode === m.key}
            className={`ssp-mode ${mode === m.key ? 'active' : ''}`}
            onClick={() => {
              setMode(m.key);
              setResults(null);
            }}
          >
            <strong>{m.label}</strong>
            <small>{m.sub}</small>
          </button>
        ))}
      </div>

      {/* div, bukan form: komponen ini berada di dalam form wizard */}
      <div className="ssp-fields" onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            void search();
          }
        }}>
        {mode === 'nik' && (
          <input inputMode="numeric" placeholder="16 digit NIK pasien" aria-label="NIK pasien" value={q.nik} onChange={(e) => setQ((s) => ({ ...s, nik: digits(e.target.value) }))} />
        )}
        {mode === 'bayi' && (
          <input inputMode="numeric" placeholder="16 digit NIK ibu" aria-label="NIK ibu" value={q.nikIbu} onChange={(e) => setQ((s) => ({ ...s, nikIbu: digits(e.target.value) }))} />
        )}
        {mode === 'id' && (
          <input placeholder="ID SATUSEHAT pasien" aria-label="ID SATUSEHAT pasien" value={q.ihsId} onChange={(e) => setQ((s) => ({ ...s, ihsId: e.target.value }))} />
        )}
        {mode === 'nama' && (
          <>
            <input placeholder="Nama sesuai KTP" aria-label="Nama pasien" value={q.name} onChange={(e) => setQ((s) => ({ ...s, name: e.target.value }))} />
            <input type="date" aria-label="Tanggal lahir pasien" value={q.birthDate} onChange={(e) => setQ((s) => ({ ...s, birthDate: e.target.value }))} />
            <select aria-label="Jenis kelamin pasien" value={q.gender} onChange={(e) => setQ((s) => ({ ...s, gender: e.target.value as typeof q.gender }))}>
              <option value="">Jenis kelamin</option>
              <option value="male">Laki-laki</option>
              <option value="female">Perempuan</option>
            </select>
          </>
        )}
        <button type="button" className="ssp-btn" disabled={!ready || busy} onClick={() => void search()}>
          {busy ? 'Mencari...' : 'Cari'}
        </button>
      </div>

      {results && (
        <div className="ssp-results" aria-live="polite">
          {results.length === 0 ? (
            <p className="ssp-empty">
              Tidak ditemukan di SATUSEHAT. Periksa ejaan/tanggal lahir, atau lanjut isi manual — pasien tetap bisa didaftarkan.
            </p>
          ) : (
            results.map((r) => (
              <div key={r.id} className="ssp-result">
                <div className="ssp-result-info">
                  <strong>{r.name ?? '(tanpa nama)'}</strong>
                  <div className="ssp-tags">
                    <span>ID {r.id}</span>
                    {r.nikMasked && <span>NIK {r.nikMasked}</span>}
                    {r.gender && <span>{r.gender === 'male' ? 'Laki-laki' : r.gender === 'female' ? 'Perempuan' : r.gender}</span>}
                    {r.birthDate && <span>{r.birthDate}</span>}
                    {r.city && <span>{r.city}</span>}
                    {r.deceased && <span className="warn">Tercatat meninggal</span>}
                  </div>
                </div>
                {r.inClinic ? (
                  <Link className="ssp-btn outline" href={`/list-pasien?patientId=${r.inClinic.id}`}>
                    Sudah terdaftar · RM {r.inClinic.noRm}
                  </Link>
                ) : (
                  <button type="button" className="ssp-btn" onClick={() => use(r)}>
                    Gunakan data ini
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
