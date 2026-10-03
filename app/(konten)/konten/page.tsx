'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { FiEdit2, FiImage, FiPlus } from 'react-icons/fi';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FeatureGuard from '@/components/auth/FeatureGuard';
import { ApiError } from '@/lib/api-client';
import { useToast } from '@/lib/toast-context';
import {
  CONTENT_STATUS_LABEL,
  contentsApi,
  templatesApi,
  type ClinicContent,
  type ContentTemplateRecord,
} from '@/lib/contents';
import { CONTENT_TEMPLATES } from '@/lib/content-templates';
import '../../styles/konten.css';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

/** Filter value for stories without a template. */
const OTHER = 'lainnya';

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

function Card({ content }: { content: ClinicContent }) {
  return (
    <li>
      <Link href={`/konten/${content.id}`} className="kt-card">
        <Thumb content={content} />
        <div className="kt-card-body">
          <span className={`kt-status ${content.status}`}>
            {content.status === 'published' ? 'Di website' : CONTENT_STATUS_LABEL[content.status]}
          </span>
          <b>{content.title}</b>
          {content.caption && <span className="kt-card-caption">{content.caption}</span>}
          <span className="kt-meta">
            {content.status === 'published' && content.publishedAt
              ? `Tampil ${formatDate(content.publishedAt)}`
              : `Diubah ${formatDate(content.updatedAt)}`}
          </span>
        </div>
      </Link>
    </li>
  );
}

interface Group {
  key: string;
  name: string;
  template: ContentTemplateRecord | null;
  items: ClinicContent[];
}

export default function KontenGalleryPage() {
  const { error } = useToast();
  const [contents, setContents] = useState<ClinicContent[]>([]);
  const [templates, setTemplates] = useState<ContentTemplateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    Promise.all([contentsApi.list(), templatesApi.list()])
      .then(([c, t]) => {
        setContents(c);
        setTemplates(t);
      })
      .catch((err) => error(err instanceof ApiError ? err.message : 'Gagal memuat konten'))
      .finally(() => setLoading(false));
  }, [error]);

  // One group per template (even an empty one, to add its first story),
  // then stories without a template under "Lainnya".
  const groups = useMemo<Group[]>(() => {
    const ids = new Set(templates.map((t) => t.id));
    const list: Group[] = templates.map((t) => ({
      key: String(t.id),
      name: t.name,
      template: t,
      items: contents.filter((c) => c.templateId === t.id),
    }));
    const other = contents.filter((c) => c.templateId === null || !ids.has(c.templateId));
    if (other.length) list.push({ key: OTHER, name: 'Lainnya', template: null, items: other });
    return list;
  }, [contents, templates]);

  const shown = filter === 'all' ? groups : groups.filter((g) => g.key === filter);
  const published = contents.filter((c) => c.status === 'published').length;

  return (
    <DashboardLayout>
      <FeatureGuard feature="konten">
        <main className="content konten-page">
          <div className="kt-head">
            <div>
              <h1>Galeri konten</h1>
              <p className="kt-subtitle">
                Story before–after per tindakan. Buat satu template per tindakan, lalu setiap konten baru tinggal diberi
                foto. Konten yang ditampilkan di website muncul di galeri website klinik.
                {contents.length > 0 && (
                  <>
                    {' '}
                    <b>
                      {contents.length} konten · {published} di website
                    </b>
                  </>
                )}
              </p>
            </div>
            <div className="kt-head-actions">
              <Link href="/konten/template/baru" className="kt-btn">
                <FiPlus aria-hidden="true" /> Template tindakan
              </Link>
              <Link href="/konten/baru" className="kt-btn primary">
                <FiPlus aria-hidden="true" /> Konten baru
              </Link>
            </div>
          </div>

          {loading ? (
            <p className="kt-empty">Memuat…</p>
          ) : (
            <>
              {templates.length === 0 && (
                <section className="kt-section kt-start" aria-labelledby="kt-start-title">
                  <h2 id="kt-start-title">Mulai dengan template per tindakan</h2>
                  <p className="kt-hint">
                    Pilih tindakan yang sering Anda kerjakan. Isi templatenya sekali (judul, keluhan, tampilan), lalu konten
                    berikutnya cukup diberi foto sebelum–sesudah.
                  </p>
                  <div className="kt-templates">
                    {CONTENT_TEMPLATES.map((t) => (
                      <Link key={t.id} href={`/konten/template/baru?preset=${t.id}`} className="kt-template">
                        <b>{t.name}</b>
                        <span>{t.desc}</span>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {groups.length > 0 && (
                <div className="kt-filter" role="tablist" aria-label="Tindakan">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={filter === 'all'}
                    className={`kt-chip${filter === 'all' ? ' on' : ''}`}
                    onClick={() => setFilter('all')}
                  >
                    Semua <span className="kt-count">{contents.length}</span>
                  </button>
                  {groups.map((g) => (
                    <button
                      key={g.key}
                      type="button"
                      role="tab"
                      aria-selected={filter === g.key}
                      className={`kt-chip${filter === g.key ? ' on' : ''}`}
                      onClick={() => setFilter(g.key)}
                    >
                      {g.name} <span className="kt-count">{g.items.length}</span>
                    </button>
                  ))}
                </div>
              )}

              {contents.length === 0 && templates.length > 0 && (
                <p className="kt-hint">Belum ada konten. Tekan &ldquo;+ Konten&rdquo; di salah satu tindakan di bawah.</p>
              )}

              {shown.map((g) => (
                <section key={g.key} className="kt-group" aria-labelledby={`kt-group-${g.key}`}>
                  <div className="kt-group-head">
                    <div>
                      <h2 id={`kt-group-${g.key}`}>{g.name}</h2>
                      <span className="kt-meta">
                        {g.template ? g.template.title : 'Konten tanpa template'} · {g.items.length} konten
                      </span>
                    </div>
                    {g.template && (
                      <div className="kt-group-actions">
                        <Link href={`/konten/template/${g.template.id}`} className="kt-btn">
                          <FiEdit2 aria-hidden="true" /> Edit template
                        </Link>
                        <Link href={`/konten/baru?template=${g.template.id}`} className="kt-btn primary">
                          <FiPlus aria-hidden="true" /> Konten
                        </Link>
                      </div>
                    )}
                  </div>
                  {g.items.length === 0 ? (
                    <Link href={`/konten/baru?template=${g.template?.id ?? ''}`} className="kt-empty-slot">
                      <FiPlus aria-hidden="true" /> Tambah konten {g.name} pertama
                    </Link>
                  ) : (
                    <ul className="kt-grid">
                      {g.items.map((c) => (
                        <Card key={c.id} content={c} />
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </>
          )}
        </main>
      </FeatureGuard>
    </DashboardLayout>
  );
}
