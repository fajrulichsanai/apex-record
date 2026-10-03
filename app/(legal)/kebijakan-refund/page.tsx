import type { Metadata } from 'next';
import Link from 'next/link';
import LegalPage, { CompanyContact, type LegalSection } from '@/components/legal/LegalPage';
import { COMPANY } from '@/lib/company';

export const metadata: Metadata = {
  title: 'Kebijakan Pengembalian Dana — ApexRecord',
  description: 'Kapan pembayaran langganan ApexRecord dapat dikembalikan, dan cara mengajukannya.',
};

const sections: LegalSection[] = [
  {
    id: 'uji-coba',
    title: 'Coba dulu tanpa bayar',
    body: (
      <p>
        Setiap klinik baru mendapat masa uji coba gratis dengan fitur lengkap. Tidak ada kartu kredit dan tidak ada
        penagihan otomatis. Kami menyarankan klinik memakai masa ini untuk memastikan ApexRecord sesuai kebutuhan
        sebelum membayar.
      </p>
    ),
  },
  {
    id: 'dapat-dikembalikan',
    title: 'Pembayaran yang dapat dikembalikan',
    body: (
      <div className="legal-table-wrap">
        <table className="legal-table">
          <thead>
            <tr>
              <th>Keadaan</th>
              <th>Pengembalian</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Pembayaran ganda, atau jumlah yang ditransfer lebih besar dari tagihan</td>
              <td>Kelebihan dikembalikan penuh</td>
            </tr>
            <tr>
              <td>Pembayaran ditolak saat verifikasi, atau langganan tidak dapat kami aktifkan</td>
              <td>Dikembalikan penuh</td>
            </tr>
            <tr>
              <td>Paket tahunan dibatalkan dalam 7 hari sejak langganan aktif</td>
              <td>Dikembalikan penuh, dikurangi biaya admin owner Multi Klinik bila ada</td>
            </tr>
            <tr>
              <td>
                ApexRecord tidak dapat diakses lebih dari 3 hari berturut-turut karena kesalahan di pihak kami
              </td>
              <td>Sebanding dengan sisa masa langganan yang belum terpakai</td>
            </tr>
          </tbody>
        </table>
      </div>
    ),
  },
  {
    id: 'tidak-dapat',
    title: 'Pembayaran yang tidak dapat dikembalikan',
    body: (
      <ul>
        <li>Paket bulanan yang sudah aktif, kecuali untuk keadaan pada tabel di atas.</li>
        <li>Paket tahunan setelah lewat 7 hari sejak aktif. Langganan tetap berjalan sampai akhir periode.</li>
        <li>Biaya admin owner Multi Klinik setelah aktivasi dilakukan.</li>
        <li>Akun yang dihentikan karena melanggar <Link href="/syarat-ketentuan">Syarat &amp; Ketentuan</Link>.</li>
      </ul>
    ),
  },
  {
    id: 'berhenti',
    title: 'Berhenti berlangganan',
    body: (
      <p>
        Klinik dapat berhenti kapan saja dengan tidak memperpanjang langganan. Tidak ada biaya pembatalan dan tidak ada
        tagihan otomatis. Setelah masa langganan dan masa tenggang 3 hari berakhir, data tetap dapat dilihat dalam mode
        hanya-baca, dan klinik dapat meminta ekspor data kapan saja.
      </p>
    ),
  },
  {
    id: 'cara',
    title: 'Cara mengajukan pengembalian dana',
    body: (
      <>
        <ol>
          <li>
            Kirim email ke <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> dengan subjek &quot;Pengembalian
            Dana&quot;, atau hubungi WhatsApp{' '}
            <a href={COMPANY.whatsappUrl} target="_blank" rel="noopener noreferrer">
              {COMPANY.phone}
            </a>
            .
          </li>
          <li>Sertakan nama klinik, email akun pemilik, tanggal pembayaran, bukti transfer, dan alasan pengajuan.</li>
          <li>Sertakan nama bank, nomor rekening, dan nama pemilik rekening tujuan pengembalian.</li>
        </ol>
        <p>
          Kami menjawab dalam 3 hari kerja. Pengembalian yang disetujui ditransfer paling lambat 14 hari kerja, tanpa
          potongan biaya transfer.
        </p>
      </>
    ),
  },
  {
    id: 'kontak',
    title: 'Hubungi kami',
    body: <CompanyContact />,
  },
];

export default function KebijakanRefundPage() {
  return (
    <LegalPage
      title="Kebijakan Pengembalian Dana"
      current="/kebijakan-refund"
      intro={
        <p>
          Kebijakan ini menjelaskan kapan pembayaran langganan ApexRecord dapat dikembalikan dan bagaimana cara
          mengajukannya. Kebijakan ini merupakan bagian dari <Link href="/syarat-ketentuan">Syarat &amp; Ketentuan</Link>.
        </p>
      }
      sections={sections}
    />
  );
}
