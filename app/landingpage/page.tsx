import type { Metadata } from 'next';
import { COMPANY } from '@/lib/company';
import LandingPage from './LandingPage';
import { FAQS } from './faqs';

/**
 * Alamat publik marketing. `apexrecord.my.id/` menampilkan halaman ini
 * (nginx), sedangkan aplikasi ada di app.apexrecord.my.id. Canonical dan
 * structured data selalu menunjuk ke domain utama supaya Google hanya
 * mengindeks satu alamat.
 */
const SITE_URL = 'https://apexrecord.my.id';
const OG_IMAGE = `${SITE_URL}/og-image.png`;

const TITLE = 'SIM Klinik & Rekam Medis Elektronik (RME/E-RM) | ApexRecord';
const DESCRIPTION =
  'Aplikasi SIM Klinik & rekam medis elektronik (RME/E-RM) untuk Klinik Pratama, Utama, TPMD & TPMDG. Odontogram, ICD-10, kasir, farmasi. Coba gratis 14 hari.';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: [
    'SIM klinik',
    'sistem informasi manajemen klinik',
    'aplikasi klinik',
    'software klinik',
    'rekam medis elektronik',
    'RME',
    'E-RM',
    'ERM klinik',
    'aplikasi rekam medis',
    'aplikasi klinik gigi',
    'rekam medis klinik pratama',
    'aplikasi TPMD TPMDG',
    'ApexRecord',
  ],
  alternates: { canonical: `${SITE_URL}/` },
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    url: `${SITE_URL}/`,
    siteName: 'ApexRecord',
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: 'ApexRecord — SIM Klinik & Rekam Medis Elektronik' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
  robots: { index: true, follow: true },
};

const ORGANIZATION = {
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: COMPANY.brand,
  legalName: COMPANY.legalName,
  url: `${SITE_URL}/`,
  logo: `${SITE_URL}/logo-apex-record.png`,
  email: COMPANY.email,
  telephone: '+6282387696487',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Jl. Jenderal Sudirman No. 7',
    addressLocality: 'Payakumbuh',
    addressRegion: 'Sumatera Barat',
    addressCountry: 'ID',
  },
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    telephone: '+6282387696487',
    email: COMPANY.email,
    availableLanguage: 'id',
  },
};

const STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@graph': [
    ORGANIZATION,
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: 'ApexRecord',
      inLanguage: 'id-ID',
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${SITE_URL}/#software`,
      name: 'ApexRecord',
      alternateName: ['ApexRecord SIM Klinik', 'ApexRecord Rekam Medis Elektronik'],
      description: DESCRIPTION,
      url: `${SITE_URL}/`,
      applicationCategory: 'HealthApplication',
      operatingSystem: 'Web',
      inLanguage: 'id-ID',
      publisher: { '@id': `${SITE_URL}/#organization` },
      audience: {
        '@type': 'Audience',
        audienceType: 'Klinik Pratama, Klinik Utama, TPMD dan TPMDG di Indonesia',
      },
      featureList: [
        'Rekam medis elektronik (RME) format SOAP',
        'Diagnosis ICD-10 dan SNOMED CT',
        'Odontogram interaktif dan template catatan gigi',
        'Reservasi dan antrian pasien',
        'Resep dan farmasi',
        'Kasir, tagihan, DP dan pelunasan',
        'Laporan kunjungan dan laporan keuangan',
        'Informed consent digital',
        'Multi cabang klinik',
      ],
    },
    {
      '@type': 'FAQPage',
      '@id': `${SITE_URL}/#faq`,
      mainEntity: FAQS.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
  ],
};

/** `<` diloloskan supaya teks apa pun di dalam data tidak bisa menutup tag <script>. */
const JSON_LD = JSON.stringify(STRUCTURED_DATA).replace(/</g, '\\u003c');

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD }} />
      <LandingPage />
    </>
  );
}
