'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { FiExternalLink, FiRefreshCw, FiSearch, FiShield, FiX } from 'react-icons/fi';
import { SatusehatShell, formatDateTime } from '@/components/satusehat/SatusehatShell';
import { kycApi, type KycAgent, type KycChallenge, type KycSession } from '@/lib/satusehat';
import { patientsApi, type Patient } from '@/lib/patients';
import { useToast } from '@/lib/toast-context';

const errText = (err: unknown) => (err instanceof Error && err.message ? err.message : 'Gagal');
const onlyDigits = (v: string) => v.replace(/\D/g, '').slice(0, 16);

/**
 * Verifikasi Profil (KYC) SATUSEHAT Mobile — petugas membuka iFrame
 * verifikasi resmi Kemenkes, lalu meminta kode verifikasi per NIK pasien.
 * URL iFrame & kode tidak disimpan di browser.
 */
export default function SatusehatKycPage() {
  const { success, error: showError } = useToast();
  const [agent, setAgent] = useState<KycAgent | null>(null);
  const [agentForm, setAgentForm] = useState({ name: '', nik: '' });
  const [session, setSession] = useState<KycSession | null>(null);
  const [starting, setStarting] = useState(false);

  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Patient[]>([]);
  const [picked, setPicked] = useState<Patient | null>(null);
  const [manual, setManual] = useState({ nik: '', name: '' });
  const [challenge, setChallenge] = useState<KycChallenge | null>(null);
  const [requesting, setRequesting] = useState(false);
  const sessionRef = useRef<string | null>(null);

  useEffect(() => {
    kycApi
      .agent()
      .then((a) => {
        setAgent(a);
        setAgentForm((f) => ({ ...f, name: a.name ?? '' }));
      })
      .catch((err) => showError(errText(err)));
  }, [showError]);

  // Akhiri sesi di server saat halaman ditutup
  useEffect(
    () => () => {
      if (sessionRef.current) void kycApi.end(sessionRef.current).catch(() => undefined);
    },
    [],
  );

  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    try {
      setResults(await patientsApi.list({ search: q.trim(), limit: 8 }));
    } catch {
      setResults([]);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void runSearch(search), 300);
    return () => clearTimeout(t);
  }, [search, runSearch]);

  async function start(e?: FormEvent) {
    e?.preventDefault();
    setStarting(true);
    try {
      if (sessionRef.current) await kycApi.end(sessionRef.current).catch(() => undefined);
      const needManual = !agent?.hasNik;
      const s = await kycApi.start(
        needManual ? { agentName: agentForm.name.trim(), agentNik: agentForm.nik } : {},
      );
      sessionRef.current = s.sessionId;
      setSession(s);
      setChallenge(null);
    } catch (err) {
      showError(errText(err));
    } finally {
      setStarting(false);
    }
  }

  function stop() {
    if (sessionRef.current) void kycApi.end(sessionRef.current).catch(() => undefined);
    sessionRef.current = null;
    setSession(null);
    setChallenge(null);
  }

  async function requestCode(e: FormEvent) {
    e.preventDefault();
    if (!session) return;
    setRequesting(true);
    try {
      const r = await kycApi.challenge(
        picked
          ? { sessionId: session.sessionId, patientId: picked.id }
          : { sessionId: session.sessionId, nik: manual.nik, name: manual.name.trim() },
      );
      setChallenge(r);
      success('Kode verifikasi dibuat');
    } catch (err) {
      showError(errText(err));
    } finally {
      setRequesting(false);
    }
  }

  const manualAgentOk = agentForm.name.trim().length > 1 && agentForm.nik.length === 16;
  const canRequest = !!session && (picked ? true : manual.nik.length === 16 && manual.name.trim().length > 1);

  return (
    <SatusehatShell
      title="Verifikasi Profil (KYC)"
      subtitle="Verifikasi akun SATUSEHAT Mobile pasien agar bisa membuka Resume Medis. Cukup sekali per pasien, di fasyankes mana pun."
      actions={
        session ? (
          <>
            <button type="button" className="ss-btn" onClick={() => start()} disabled={starting}>
              <FiRefreshCw /> Sesi baru
            </button>
            <button type="button" className="ss-btn" onClick={stop}>
              <FiX /> Selesai
            </button>
          </>
        ) : null
      }
    >
      {!session ? (
        <div className="ss-card kyc-start">
          <h2>
            <FiShield /> Mulai verifikasi
          </h2>
          <ol className="kyc-steps">
            <li>Pasien membuka aplikasi SATUSEHAT Mobile dan memilih Verifikasi Profil.</li>
            <li>Petugas memulai sesi di sini, lalu mengikuti langkah pada layar verifikasi SATUSEHAT.</li>
            <li>Bila diminta, buat kode verifikasi untuk NIK pasien dan bacakan ke pasien.</li>
          </ol>
          {agent === null ? (
            <p className="ss-muted">Memuat...</p>
          ) : agent.hasNik ? (
            <div className="kyc-agent">
              <span>
                Petugas: <strong>{agent.name}</strong>
              </span>
              <button type="button" className="ss-btn primary" onClick={() => start()} disabled={starting}>
                {starting ? 'Menyiapkan...' : 'Mulai verifikasi'}
              </button>
            </div>
          ) : (
            <form className="ss-form ss-form-wide" onSubmit={start} aria-label="Data petugas KYC">
              <label>
                Nama petugas
                <input
                  className="ss-input"
                  value={agentForm.name}
                  maxLength={100}
                  onChange={(e) => setAgentForm((f) => ({ ...f, name: e.target.value }))}
                />
              </label>
              <label>
                NIK petugas
                <input
                  className="ss-input"
                  inputMode="numeric"
                  value={agentForm.nik}
                  placeholder="16 digit sesuai KTP"
                  onChange={(e) => setAgentForm((f) => ({ ...f, nik: onlyDigits(e.target.value) }))}
                />
              </label>
              <small className="ss-span-2">
                Akun Anda belum tertaut ke data nakes ber-NIK. NIK petugas hanya dikirim ke SATUSEHAT dan tidak disimpan.
              </small>
              <div className="ss-actions ss-span-2">
                <button type="submit" className="ss-btn primary" disabled={starting || !manualAgentOk}>
                  {starting ? 'Menyiapkan...' : 'Mulai verifikasi'}
                </button>
              </div>
            </form>
          )}
        </div>
      ) : (
        <div className="kyc-layout">
          <div className="ss-card kyc-frame-card">
            <div className="kyc-frame-head">
              <span>
                Petugas <strong>{session.agentName}</strong> · sesi berlaku s.d. {formatDateTime(session.expiresAt)}
              </span>
              <a href={session.url} target="_blank" rel="noopener noreferrer" className="ss-btn sm">
                <FiExternalLink /> Buka di tab baru
              </a>
            </div>
            <iframe
              title="Verifikasi Profil SATUSEHAT"
              src={session.url}
              className="kyc-frame"
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="ss-card kyc-code-card">
            <h2>Kode verifikasi pasien</h2>
            <form className="ss-form" onSubmit={requestCode} aria-label="Kode verifikasi pasien">
              {picked ? (
                <div className="kyc-picked">
                  <span>
                    <strong>{picked.name}</strong>
                    <small>No. RM {picked.noRm}</small>
                  </span>
                  <button type="button" className="ss-btn sm" onClick={() => setPicked(null)}>
                    Ganti
                  </button>
                </div>
              ) : (
                <>
                  <label>
                    Cari pasien klinik
                    <span className="kyc-search">
                      <FiSearch />
                      <input
                        className="ss-input"
                        value={search}
                        placeholder="Nama / No. RM"
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </span>
                  </label>
                  {results.length > 0 && (
                    <ul className="kyc-results">
                      {results.map((p) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setPicked(p);
                              setResults([]);
                              setSearch('');
                            }}
                          >
                            <strong>{p.name}</strong>
                            <small>No. RM {p.noRm}</small>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="ss-muted kyc-or">atau isi manual (pasien belum terdaftar)</p>
                  <label>
                    NIK pasien
                    <input
                      className="ss-input"
                      inputMode="numeric"
                      value={manual.nik}
                      placeholder="16 digit"
                      onChange={(e) => setManual((m) => ({ ...m, nik: onlyDigits(e.target.value) }))}
                    />
                  </label>
                  <label>
                    Nama sesuai KTP
                    <input
                      className="ss-input"
                      value={manual.name}
                      maxLength={100}
                      onChange={(e) => setManual((m) => ({ ...m, name: e.target.value }))}
                    />
                  </label>
                </>
              )}
              <button type="submit" className="ss-btn primary" disabled={requesting || !canRequest}>
                {requesting ? 'Meminta kode...' : 'Buat kode verifikasi'}
              </button>
            </form>

            {challenge && (
              <div className="kyc-code" aria-live="polite">
                <span className="kyc-code-value">{challenge.challengeCode}</span>
                <span>{challenge.name}</span>
                {challenge.expiredAt && <small>Berlaku s.d. {formatDateTime(challenge.expiredAt)}</small>}
                {challenge.ihsNumber && <small>ID SATUSEHAT {challenge.ihsNumber}</small>}
              </div>
            )}
          </div>
        </div>
      )}
    </SatusehatShell>
  );
}
