'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '@/lib/api-client';
import { clinicNotesApi, type ClinicNotes } from '@/lib/super-admin';
import { useToast } from '@/lib/toast-context';
import { SkeletonBlock, StatusBadge, formatDate, formatDateTime } from './ui';

function waLink(phone: string) {
  const digits = phone.replace(/\D/g, '');
  return `https://wa.me/${digits.startsWith('0') ? `62${digits.slice(1)}` : digits}`;
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Catatan internal Super Admin: PIC, WhatsApp, dan catatan tindak lanjut (PRD UP-06). */
export default function ClinicNotesCard({ clinicId }: { clinicId: number }) {
  const { error: showError } = useToast();
  const [data, setData] = useState<ClinicNotes | null>(null);
  const [picName, setPicName] = useState('');
  const [picPhone, setPicPhone] = useState('');
  const [editingPic, setEditingPic] = useState(false);
  const [body, setBody] = useState('');
  const [followUpOn, setFollowUpOn] = useState('');
  const [busy, setBusy] = useState(false);

  const apply = (next: ClinicNotes) => {
    setData(next);
    setPicName(next.pic.name ?? '');
    setPicPhone(next.pic.phone ?? '');
  };

  const load = useCallback(async () => {
    try {
      apply(await clinicNotesApi.get(clinicId));
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Gagal memuat catatan');
    }
  }, [clinicId, showError]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(fn: () => Promise<ClinicNotes>) {
    setBusy(true);
    try {
      apply(await fn());
      return true;
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Gagal menyimpan');
      return false;
    } finally {
      setBusy(false);
    }
  }

  const today = todayIso();

  return (
    <div className="card">
      <div className="card-head">
        <h3>Catatan internal</h3>
        <span className="text-muted">Hanya terlihat oleh Super Admin</span>
      </div>
      {!data ? (
        <SkeletonBlock lines={3} />
      ) : (
        <>
          {editingPic ? (
            <div className="notes-pic-form">
              <div className="sa-field">
                <label htmlFor="pic-name">PIC klinik</label>
                <input id="pic-name" value={picName} maxLength={100} onChange={(e) => setPicName(e.target.value)} />
              </div>
              <div className="sa-field">
                <label htmlFor="pic-phone">WhatsApp</label>
                <input
                  id="pic-phone"
                  value={picPhone}
                  maxLength={30}
                  inputMode="tel"
                  placeholder="08…"
                  onChange={(e) => setPicPhone(e.target.value)}
                />
              </div>
              <div className="sa-row">
                <button
                  type="button"
                  className="btn-primary btn-sm"
                  disabled={busy}
                  onClick={async () => {
                    if (await run(() => clinicNotesApi.setPic(clinicId, { name: picName, phone: picPhone }))) {
                      setEditingPic(false);
                    }
                  }}
                >
                  Simpan
                </button>
                <button type="button" className="btn-outline btn-sm" onClick={() => setEditingPic(false)} disabled={busy}>
                  Batal
                </button>
              </div>
            </div>
          ) : (
            <dl className="sa-kv">
              <dt>PIC</dt>
              <dd>
                {data.pic.name || '-'}{' '}
                <button type="button" className="sa-link" onClick={() => setEditingPic(true)}>
                  Ubah
                </button>
              </dd>
              <dt>WhatsApp</dt>
              <dd>
                {data.pic.phone ? (
                  <a href={waLink(data.pic.phone)} target="_blank" rel="noopener noreferrer">
                    {data.pic.phone}
                  </a>
                ) : (
                  '-'
                )}
              </dd>
            </dl>
          )}

          <form
            className="notes-form"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!body.trim()) return;
              if (await run(() => clinicNotesApi.add(clinicId, body.trim(), followUpOn))) {
                setBody('');
                setFollowUpOn('');
              }
            }}
          >
            <div className="sa-field">
              <label htmlFor="note-body">Catatan baru</label>
              <textarea
                id="note-body"
                rows={2}
                maxLength={2000}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="mis. Owner minta demo fitur SATUSEHAT minggu depan"
              />
            </div>
            <div className="sa-row">
              <div className="sa-field">
                <label htmlFor="note-follow">Tindak lanjut (opsional)</label>
                <input id="note-follow" type="date" value={followUpOn} onChange={(e) => setFollowUpOn(e.target.value)} />
              </div>
              <button type="submit" className="btn-primary btn-sm notes-submit" disabled={busy || !body.trim()}>
                Tambah catatan
              </button>
            </div>
          </form>

          {data.notes.length === 0 ? (
            <p className="text-sub">Belum ada catatan.</p>
          ) : (
            <ul className="notes-list">
              {data.notes.map((n) => (
                <li key={n.id} className={n.doneAt ? 'done' : ''}>
                  <div className="notes-body">{n.body}</div>
                  <div className="notes-meta">
                    {n.createdByName ?? 'Super Admin'} · {formatDateTime(n.createdAt)}
                    {n.followUpOn && (
                      <>
                        {' · '}
                        <StatusBadge tone={n.doneAt ? 'neutral' : n.followUpOn <= today ? 'bad' : 'info'}>
                          {n.doneAt ? 'Selesai' : `Tindak lanjut ${formatDate(n.followUpOn)}`}
                        </StatusBadge>
                      </>
                    )}
                  </div>
                  <div className="cell-actions">
                    {n.followUpOn && (
                      <button
                        type="button"
                        className="sa-link"
                        disabled={busy}
                        onClick={() => run(() => clinicNotesApi.setDone(clinicId, n.id, !n.doneAt))}
                      >
                        {n.doneAt ? 'Buka lagi' : 'Tandai selesai'}
                      </button>
                    )}
                    <button
                      type="button"
                      className="sa-link"
                      disabled={busy}
                      onClick={() => {
                        if (window.confirm('Hapus catatan ini?')) void run(() => clinicNotesApi.remove(clinicId, n.id));
                      }}
                    >
                      Hapus
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
