import Link from 'next/link';
import type { ReactNode } from 'react';
import { COMPANY, LEGAL_EFFECTIVE_DATE, LEGAL_LINKS } from '@/lib/company';
import '@/app/styles/legal.css';

export interface LegalSection {
  id: string;
  title: string;
  body: ReactNode;
}

/**
 * Shared shell for the public legal pages (privasi, S&K, refund): header back
 * to the landing page, a table of contents, numbered sections, and the
 * company's contact details.
 */
export default function LegalPage({
  title,
  intro,
  sections,
  current,
}: {
  title: string;
  intro: ReactNode;
  sections: LegalSection[];
  current: (typeof LEGAL_LINKS)[number]['href'];
}) {
  return (
    <div className="legal">
      <header className="legal-top">
        <div className="legal-wrap legal-top-row">
          <Link href="/landingpage" className="legal-brand">
            {/* eslint-disable-next-line @next/next/no-img-element -- small static logo */}
            <img src="/logo-apex-record.png" alt="" />
            <span>
              Apex<em>Record</em>
            </span>
          </Link>
          <nav className="legal-nav" aria-label="Dokumen legal">
            {LEGAL_LINKS.map((l) => (
              <Link key={l.href} href={l.href} aria-current={l.href === current ? 'page' : undefined}>
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="legal-wrap legal-main">
        <div className="legal-head">
          <p className="legal-eyebrow">Dokumen legal · {COMPANY.brand}</p>
          <h1>{title}</h1>
          <p className="legal-date">Berlaku sejak {LEGAL_EFFECTIVE_DATE}</p>
          <div className="legal-intro">{intro}</div>
        </div>

        <div className="legal-grid">
          <nav className="legal-toc" aria-label="Daftar isi">
            <p>Daftar isi</p>
            <ol>
              {sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`}>{s.title}</a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="legal-body">
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} className="legal-section">
                <h2>
                  <span>{i + 1}.</span> {s.title}
                </h2>
                {s.body}
              </section>
            ))}
          </div>
        </div>
      </main>

      <footer className="legal-foot">
        <div className="legal-wrap legal-foot-row">
          <div>
            <b>{COMPANY.legalName}</b>
            <p>{COMPANY.address}</p>
            <p>
              <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> ·{' '}
              <a href={COMPANY.whatsappUrl} target="_blank" rel="noopener noreferrer">
                WhatsApp {COMPANY.phone}
              </a>
            </p>
          </div>
          <nav aria-label="Dokumen legal lain">
            {LEGAL_LINKS.map((l) => (
              <Link key={l.href} href={l.href}>
                {l.label}
              </Link>
            ))}
            <Link href="/landingpage">Beranda</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

/** The company's contact block, for "hubungi kami" sections. */
export function CompanyContact() {
  return (
    <ul className="legal-contact">
      <li>
        <span>Badan usaha</span>
        {COMPANY.legalName}
      </li>
      <li>
        <span>Alamat</span>
        {COMPANY.address}
      </li>
      <li>
        <span>Email</span>
        <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
      </li>
      <li>
        <span>WhatsApp</span>
        <a href={COMPANY.whatsappUrl} target="_blank" rel="noopener noreferrer">
          {COMPANY.phone}
        </a>
      </li>
    </ul>
  );
}
