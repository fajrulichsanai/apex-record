'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/lib/toast-context';
import {
  prescriptionsApi,
  type PrescriptionItem,
  type PrescriptionReview,
  type ReviewAnswer,
  type ReviewGroup,
} from '@/lib/prescriptions';
import './PharmacyPanel.css';

const errMsg = (err: unknown, fallback: string) => (err instanceof Error && err.message ? err.message : fallback);
const fmt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '';

/** Pengeluaran obat butuh kode produk aktual KFA (93…) atau racikan */
const canDispense = (item: PrescriptionItem) => !!item.compoundType || !!item.kfaCode?.startsWith('93');

type Action = { id: number; kind: 'dispense' | 'administer' };

/**
 * Farmasi untuk resep kunjungan ini: penyerahan obat (MedicationDispense),
 * pemberian obat di klinik (MedicationAdministration), dan pengkajian resep
 * (QuestionnaireResponse Q0007). Terkirim bersama kunjungan.
 */
export default function PharmacyPanel({
  encounterId,
  items,
  onChanged,
}: {
  encounterId: number;
  items: PrescriptionItem[];
  onChanged: () => Promise<void> | void;
}) {
  const { success, error } = useToast();
  const [action, setAction] = useState<Action | null>(null);
  const [batch, setBatch] = useState({ number: '', expiry: '' });
  const [dose, setDose] = useState('');
  const [busy, setBusy] = useState(false);
  const [questions, setQuestions] = useState<ReviewGroup[]>([]);
  const [review, setReview] = useState<PrescriptionReview | null>(null);
  const [answers, setAnswers] = useState<Record<string, ReviewAnswer>>({});
  const [note, setNote] = useState('');
  const [editingReview, setEditingReview] = useState(false);

  useEffect(() => {
    let alive = true;
    prescriptionsApi
      .getReview(encounterId)
      .then(({ review: r, questions: q }) => {
        if (!alive) return;
        setQuestions(q);
        setReview(r);
        setAnswers(r?.answers ?? {});
        setNote(r?.note ?? '');
      })
      .catch(() => alive && setQuestions([]));
    return () => {
      alive = false;
    };
  }, [encounterId]);

  const run = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try {
      await fn();
      await onChanged();
      success(done);
      setAction(null);
      return true;
    } catch (err) {
      error(errMsg(err, 'Gagal menyimpan'));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const allQuestions = questions.flatMap((g) => g.items);
  const answered = allQuestions.filter((q) => answers[q.linkId] !== undefined).length;

  return (
    <div className="ph-panel">
      <section className="ph-card" aria-labelledby="ph-title">
        <div className="ph-head">
          <h3 id="ph-title">Farmasi</h3>
          <p>Catat obat yang diserahkan ke pasien atau diberikan langsung di klinik.</p>
        </div>
        <ul className="ph-list">
          {items.map((item) => (
            <li key={item.id} className="ph-item">
              <div className="ph-item-main">
                <strong>{item.drugName}</strong>
                <div className="ph-states">
                  {item.dispensedAt && (
                    <span className="ph-badge ok">
                      Diserahkan {fmt(item.dispensedAt)}
                      {item.batchNumber && ` · Batch ${item.batchNumber}`}
                      {item.batchExpiry && ` · ED ${item.batchExpiry.slice(0, 10)}`}
                    </span>
                  )}
                  {item.administeredAt && (
                    <span className="ph-badge ok">
                      Diberikan di klinik {fmt(item.administeredAt)}
                      {item.administeredDose && ` · ${item.administeredDose}`}
                    </span>
                  )}
                  {!item.dispensedAt && !item.administeredAt && <span className="ph-badge">Belum diserahkan</span>}
                </div>
                {!canDispense(item) && !item.dispensedAt && (
                  <span className="ph-hint">
                    Penyerahan obat ke SATUSEHAT butuh kode produk KFA (93…) — lengkapi kode obat di daftar resep.
                  </span>
                )}
              </div>

              {action?.id === item.id ? (
                <form
                  className="ph-form"
                  aria-label={action.kind === 'dispense' ? 'Serahkan obat' : 'Berikan obat'}
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (action.kind === 'dispense') {
                      void run(
                        () =>
                          prescriptionsApi.dispense(encounterId, item.id, {
                            batchNumber: batch.number.trim() || undefined,
                            batchExpiry: batch.expiry || undefined,
                          }),
                        'Penyerahan obat dicatat',
                      );
                    } else {
                      void run(
                        () => prescriptionsApi.administer(encounterId, item.id, { dose: dose.trim() || undefined }),
                        'Pemberian obat dicatat',
                      );
                    }
                  }}
                >
                  {action.kind === 'dispense' ? (
                    <>
                      <label>
                        No. batch
                        <input
                          type="text"
                          aria-label="Nomor batch"
                          value={batch.number}
                          maxLength={50}
                          onChange={(e) => setBatch((b) => ({ ...b, number: e.target.value }))}
                          placeholder="opsional"
                        />
                      </label>
                      <label>
                        Kedaluwarsa
                        <input
                          type="date"
                          aria-label="Tanggal kedaluwarsa"
                          value={batch.expiry}
                          onChange={(e) => setBatch((b) => ({ ...b, expiry: e.target.value }))}
                        />
                      </label>
                    </>
                  ) : (
                    <label className="ph-span-2">
                      Dosis yang diberikan
                      <input
                        type="text"
                        aria-label="Dosis yang diberikan"
                        value={dose}
                        maxLength={100}
                        onChange={(e) => setDose(e.target.value)}
                        placeholder="mis. 1 tablet, 2 mL"
                      />
                    </label>
                  )}
                  <div className="ph-actions-row ph-span-2">
                    <button type="button" className="btn-outline" onClick={() => setAction(null)} disabled={busy}>
                      Batal
                    </button>
                    <button type="submit" className="btn-primary" disabled={busy}>
                      Simpan
                    </button>
                  </div>
                </form>
              ) : (
                <div className="ph-actions">
                  {item.dispensedAt ? (
                    <button
                      type="button"
                      className="ph-link danger"
                      disabled={busy}
                      onClick={() => run(() => prescriptionsApi.undoDispense(encounterId, item.id), 'Penyerahan dibatalkan')}
                    >
                      Batalkan penyerahan
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="ph-link"
                      onClick={() => {
                        setBatch({ number: '', expiry: '' });
                        setAction({ id: item.id, kind: 'dispense' });
                      }}
                    >
                      Serahkan obat
                    </button>
                  )}
                  {item.administeredAt ? (
                    <button
                      type="button"
                      className="ph-link danger"
                      disabled={busy}
                      onClick={() =>
                        run(() => prescriptionsApi.undoAdminister(encounterId, item.id), 'Pemberian dibatalkan')
                      }
                    >
                      Batalkan pemberian
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="ph-link"
                      onClick={() => {
                        setDose('');
                        setAction({ id: item.id, kind: 'administer' });
                      }}
                    >
                      Berikan di klinik
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      {questions.length > 0 && (
        <section className="ph-card" aria-labelledby="ph-review-title">
          <div className="ph-head">
            <h3 id="ph-review-title">Pengkajian Resep</h3>
            <p>
              Telaah resep oleh apoteker/tenaga farmasi (Questionnaire Q0007 Kemenkes).
              {review && !editingReview && ` Dikaji ${fmt(review.reviewedAt)}.`}
            </p>
          </div>
          {review && !editingReview ? (
            <div className="ph-review-summary">
              <span>
                {
                  allQuestions.filter((q) =>
                    q.kind === 'coding' ? review.answers[q.linkId] === 'tidak_sesuai' : review.answers[q.linkId] === true,
                  ).length
                }{' '}
                temuan masalah dari {allQuestions.length} pertanyaan
              </span>
              {review.note && <span className="ph-hint">Catatan: {review.note}</span>}
              <button type="button" className="ph-link" onClick={() => setEditingReview(true)}>
                Ubah pengkajian
              </button>
            </div>
          ) : (
            <form
              className="ph-review"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                try {
                  const saved = await prescriptionsApi.saveReview(encounterId, {
                    answers,
                    note: note.trim() || undefined,
                  });
                  setReview(saved);
                  setEditingReview(false);
                  success('Pengkajian resep disimpan');
                } catch (err) {
                  error(errMsg(err, 'Gagal menyimpan pengkajian'));
                } finally {
                  setBusy(false);
                }
              }}
            >
              <div className="ph-review-tools">
                <span className="ph-hint">
                  {answered}/{allQuestions.length} terjawab
                </span>
                <button
                  type="button"
                  className="ph-link"
                  onClick={() =>
                    setAnswers(
                      Object.fromEntries(
                        allQuestions.map((q) => [q.linkId, q.kind === 'coding' ? 'sesuai' : false] as const),
                      ),
                    )
                  }
                >
                  Semua sesuai / tidak ada masalah
                </button>
              </div>
              {questions.map((g) => (
                <fieldset key={g.linkId} className="ph-group">
                  <legend>{g.text}</legend>
                  {g.items.map((q) => {
                    const opts: [ReviewAnswer, string][] =
                      q.kind === 'coding'
                        ? [
                            ['sesuai', 'Sesuai'],
                            ['tidak_sesuai', 'Tidak sesuai'],
                          ]
                        : [
                            [false, 'Tidak ada'],
                            [true, 'Ada'],
                          ];
                    return (
                      <div key={q.linkId} className="ph-q" role="radiogroup" aria-label={q.text}>
                        <span>{q.text}</span>
                        <div className="ph-opts">
                          {opts.map(([v, label]) => (
                            <label key={String(v)} className={answers[q.linkId] === v ? 'active' : ''}>
                              <input
                                type="radio"
                                name={`q-${q.linkId}`}
                                checked={answers[q.linkId] === v}
                                onChange={() => setAnswers((a) => ({ ...a, [q.linkId]: v }))}
                              />
                              {label}
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </fieldset>
              ))}
              <label className="ph-note">
                Catatan
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="opsional, mis. tindak lanjut temuan"
                />
              </label>
              <div className="ph-actions-row">
                {review && (
                  <button type="button" className="btn-outline" onClick={() => setEditingReview(false)} disabled={busy}>
                    Batal
                  </button>
                )}
                <button type="submit" className="btn-primary" disabled={busy || answered < allQuestions.length}>
                  Simpan pengkajian
                </button>
              </div>
            </form>
          )}
        </section>
      )}
    </div>
  );
}
