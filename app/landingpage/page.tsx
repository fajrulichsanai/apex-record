import type { Metadata } from 'next';
import LandingPage from './LandingPage';

export const metadata: Metadata = {
  title: 'ApexRecord — Software Manajemen Klinik Indonesia',
  description:
    'ApexRecord membantu Klinik Pratama, Klinik Utama, TPMD, dan TPMDG mengelola rekam medis, tarif, farmasi, dan laporan keuangan dalam satu platform.',
};

export default function Page() {
  return <LandingPage />;
}
