'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FiImage, FiPlus } from 'react-icons/fi';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FeatureGuard from '@/components/auth/FeatureGuard';
import { ApiError } from '@/lib/api-client';
import { useToast } from '@/lib/toast-context';
import { CONTENT_STATUS_LABEL, contentsApi, type ClinicContent } from '@/lib/contents';
import { CONTENT_TEMPLATES } from '@/lib/content-templates';
import '../../styles/konten.css';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

/** Thumbnail: the published story, else the before photo. */
function Thumb({ content }: { content: ClinicContent }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    const which = content.imageUrl ? 'rendered' : content.beforeImageUrl ? 'before' : null;
    if (!which) return;
    contentsApi
      .photo(content.id, which)
      .then((blob) => {
        if (cancelled || !blob) return;
        url = URL.createObjectURL(blob);
        setSrc(url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [content.id, content.imageUrl, content.beforeImageUrl]);

  return (
    <div className="kt-thumb">
      {/* eslint-disable-next-line @next/next/no-img-element -- blob URL */}
      {src ? <img src={src} alt="" /> : <FiImage aria-hidden="true" />}
    </div>
  );
}

export default function KontenPage() {
  const { error } = useToast();
  const [contents, setContents] = useState<ClinicContent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    contentsApi
      .list()
      .then(setContents)
      .catch((err) => error(err instanceof ApiError ? err.message : 'Gagal memuat konten'))
      .finally(() => setLoading(false));
  }, [error]);

  return (
    <DashboardLayout>
      <FeatureGuard feature="konten">
        <main className="content konten-page">
          <div className="kt-head">
            <div>
              <h1>Konten</h1>
              <p className="kt-subtitle">
                Buat story before–after untuk Instagram &amp; WhatsApp. Konten yang diterbitkan juga tampil di website klinik
                lewat API.
              </p>
            </div>
            <Link href="/konten/baru" className="kt-btn primary">
              <FiPlus aria-hidden="true" /> Buat konten
            </Link>
          </div>

          <section className="kt-start" aria-labelledby="kt-start-title">
            <h2 id="kt-start-title">Mulai dari template</h2>
            <div className="kt-templates">
              {CONTENT_TEMPLATES.map((t) => (
                <Link key={t.id} href={`/konten/baru?template=${t.id}`} className="kt-template">
                  <b>{t.title}</b>
                  <span>{t.desc}</span>
                </Link>
              ))}
            </div>
          </section>

          {loading ? (
            <p className="kt-empty">Memuat…</p>
          ) : contents.length === 0 ? (
            <div className="kt-empty-card">
              <FiImage aria-hidden="true" />
              <p>Belum ada konten. Mulai dengan foto sebelum dan sesudah perawatan pasien (dengan izin pasien).</p>
              <Link href="/konten/baru" className="kt-btn primary">
                Buat konten pertama
              </Link>
            </div>
          ) : (
            <ul className="kt-grid">
              {contents.map((c) => (
                <li key={c.id}>
                  <Link href={`/konten/${c.id}`} className="kt-card">
                    <Thumb content={c} />
                    <div className="kt-card-body">
                      <span className={`kt-status ${c.status}`}>{CONTENT_STATUS_LABEL[c.status]}</span>
                      <b>{c.title}</b>
                      <span className="kt-meta">
                        {c.status === 'published' && c.publishedAt
                          ? `Terbit ${formatDate(c.publishedAt)}`
                          : `Diubah ${formatDate(c.updatedAt)}`}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </main>
      </FeatureGuard>
    </DashboardLayout>
  );
}
