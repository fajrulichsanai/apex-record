import type { Metadata } from 'next';
import Link from 'next/link';
import LegalPage, { CompanyContact, type LegalSection } from '@/components/legal/LegalPage';
import { COMPANY } from '@/lib/company';

export const metadata: Metadata = {
  title: 'Syarat & Ketentuan — ApexRecord',
  description: `Syarat dan ketentuan penggunaan ApexRecord oleh klinik dan praktik mandiri, dikelola oleh ${COMPANY.legalName}.`,
};

const sections: LegalSection[] = [
  {
    id: 'penerimaan',
    title: 'Penerimaan syarat',
    body: (
      <>
        <p>
          Dengan mendaftarkan klinik atau memakai ApexRecord, Anda menyetujui Syarat &amp; Ketentuan ini, beserta{' '}
          <Link href="/kebijakan-privasi">Kebijakan Privasi</Link> dan{' '}
          <Link href="/kebijakan-refund">Kebijakan Pengembalian Dana</Link>. Jika Anda mendaftar atas nama klinik, Anda
          menyatakan berwenang mewakili klinik tersebut.
        </p>
        <p>
          &quot;Kami&quot; berarti {COMPANY.legalName} selaku pengelola ApexRecord. &quot;Klinik&quot; berarti klinik,
          praktik mandiri dokter, atau dokter gigi yang berlangganan. &quot;Pengguna&quot; berarti setiap orang yang
          memiliki akun di bawah klinik, termasuk pemilik, dokter, dan staf.
        </p>
      </>
    ),
  },
  {
    id: 'layanan',
    title: 'Layanan ApexRecord',
    body: (
      <p>
        ApexRecord adalah perangkat lunak berbasis web untuk rekam medis elektronik, reservasi, transaksi, laporan, dan
        pengelolaan operasional klinik, termasuk integrasi opsional dengan SATUSEHAT Kementerian Kesehatan. Fitur yang
        tersedia mengikuti paket langganan yang dipilih dan dapat bertambah atau berubah seiring pengembangan.
      </p>
    ),
  },
  {
    id: 'akun',
    title: 'Akun dan keamanan',
    body: (
      <ul>
        <li>Data pendaftaran harus benar dan diperbarui bila berubah.</li>
        <li>
          Pemilik klinik bertanggung jawab atas akun yang dibuat untuk dokter dan staf, termasuk mencabut akses orang
          yang sudah tidak bekerja di klinik.
        </li>
        <li>
          Setiap pengguna wajib menjaga kerahasiaan password dan perangkat verifikasi dua langkah. Satu akun hanya untuk
          satu orang dan tidak boleh dipakai bersama.
        </li>
        <li>Segera beri tahu kami bila Anda menduga akun disalahgunakan.</li>
      </ul>
    ),
  },
  {
    id: 'langganan',
    title: 'Uji coba, langganan, dan pembayaran',
    body: (
      <>
        <ul>
          <li>
            Klinik baru mendapat masa uji coba gratis selama 15 hari, atau sesuai yang tercantum saat pendaftaran. Tidak
            ada penagihan otomatis setelah uji coba berakhir.
          </li>
          <li>
            Langganan dibayar di muka per bulan atau per tahun sesuai harga yang tercantum saat pembayaran. Paket Multi
            Klinik dikenakan biaya per klinik ditambah biaya admin owner yang tercantum jelas di rincian tagihan.
          </li>
          <li>
            Pembayaran dilakukan melalui QRIS atau transfer, lalu bukti pembayaran diunggah di halaman Langganan.
            Langganan aktif setelah pembayaran diverifikasi oleh tim kami.
          </li>
          <li>
            Setelah masa langganan berakhir, klinik mendapat masa tenggang 3 hari. Setelah itu akun beralih ke mode
            hanya-baca: data tetap dapat dilihat, tetapi data baru tidak dapat ditambahkan atau diubah sampai langganan
            diperpanjang.
          </li>
          <li>
            Perubahan harga akan diumumkan paling lambat 30 hari sebelum berlaku dan tidak memengaruhi periode yang sudah
            dibayar.
          </li>
        </ul>
        <p>
          Pengembalian dana diatur dalam <Link href="/kebijakan-refund">Kebijakan Pengembalian Dana</Link>.
        </p>
      </>
    ),
  },
  {
    id: 'tanggung-jawab-klinik',
    title: 'Tanggung jawab klinik atas data dan layanan medis',
    body: (
      <ul>
        <li>
          Klinik adalah pemilik dan pengendali data pasien serta rekam medis yang dimasukkan ke ApexRecord, dan
          bertanggung jawab atas kebenaran isinya.
        </li>
        <li>
          Klinik bertanggung jawab memperoleh dasar yang sah untuk memproses data pasien, termasuk persetujuan pasien
          atau wali bila diperlukan, sesuai UU Pelindungan Data Pribadi dan peraturan di bidang kesehatan.
        </li>
        <li>
          ApexRecord adalah alat bantu pencatatan. Fitur pencarian diagnosis ICD-10/SNOMED CT, template SOAP, dan
          pengingat bukan nasihat medis. Keputusan klinis sepenuhnya menjadi tanggung jawab tenaga kesehatan.
        </li>
        <li>
          Klinik bertanggung jawab atas izin praktik, kredensial SATUSEHAT, dan kewajiban pelaporan ke instansi terkait.
        </li>
        <li>Klinik wajib memenuhi kewajiban penyimpanan rekam medis sesuai peraturan yang berlaku.</li>
      </ul>
    ),
  },
  {
    id: 'larangan',
    title: 'Penggunaan yang dilarang',
    body: (
      <>
        <p>Pengguna tidak diperbolehkan:</p>
        <ul>
          <li>memasukkan data palsu atau data orang lain tanpa dasar yang sah;</li>
          <li>mengakses data klinik lain atau mencoba menembus pembatasan akses dan keamanan aplikasi;</li>
          <li>membagikan API key kepada pihak yang tidak berwenang atau memakainya melebihi kuota paket;</li>
          <li>menyalin, menjual kembali, atau merekayasa balik aplikasi;</li>
          <li>memakai ApexRecord untuk kegiatan yang melanggar hukum.</li>
        </ul>
        <p>Pelanggaran dapat mengakibatkan penangguhan atau penghentian akun.</p>
      </>
    ),
  },
  {
    id: 'data-dan-hki',
    title: 'Kepemilikan data dan hak kekayaan intelektual',
    body: (
      <>
        <p>
          Data yang dimasukkan klinik tetap milik klinik. Kami hanya memprosesnya untuk menyediakan layanan sesuai{' '}
          <Link href="/kebijakan-privasi">Kebijakan Privasi</Link>. Klinik dapat meminta ekspor data kapan saja.
        </p>
        <p>
          Aplikasi ApexRecord, termasuk kode, desain, merek, dan logo, adalah milik {COMPANY.legalName}. Langganan
          memberi klinik hak pakai yang tidak eksklusif dan tidak dapat dialihkan selama langganan berlaku.
        </p>
      </>
    ),
  },
  {
    id: 'ketersediaan',
    title: 'Ketersediaan layanan',
    body: (
      <p>
        Kami berupaya menjaga ApexRecord tetap dapat diakses setiap saat, tetapi tidak menjamin layanan bebas gangguan.
        Pemeliharaan terjadwal akan diberitahukan terlebih dahulu bila memungkinkan. Kami tidak bertanggung jawab atas
        gangguan yang disebabkan oleh koneksi internet klinik, layanan pihak ketiga seperti SATUSEHAT, atau keadaan kahar.
      </p>
    ),
  },
  {
    id: 'batasan',
    title: 'Batasan tanggung jawab',
    body: (
      <p>
        Sejauh diizinkan hukum, total tanggung jawab kami atas kerugian yang timbul dari penggunaan ApexRecord dibatasi
        sebesar biaya langganan yang dibayar klinik dalam 12 bulan terakhir sebelum kejadian. Kami tidak bertanggung
        jawab atas kerugian tidak langsung, termasuk kehilangan pendapatan, maupun atas keputusan medis yang diambil
        berdasarkan data di aplikasi.
      </p>
    ),
  },
  {
    id: 'penghentian',
    title: 'Penghentian layanan',
    body: (
      <ul>
        <li>
          Klinik dapat berhenti berlangganan kapan saja dengan tidak memperpanjang langganan. Tidak ada biaya pembatalan.
        </li>
        <li>
          Klinik dapat meminta ekspor seluruh data atau penutupan akun melalui email ke{' '}
          <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>.
        </li>
        <li>
          Kami dapat menangguhkan atau menghentikan akun yang melanggar Syarat &amp; Ketentuan ini setelah memberi
          peringatan, kecuali untuk pelanggaran berat yang membahayakan keamanan data.
        </li>
      </ul>
    ),
  },
  {
    id: 'hukum',
    title: 'Hukum yang berlaku dan penyelesaian sengketa',
    body: (
      <p>
        Syarat &amp; Ketentuan ini tunduk pada hukum Republik Indonesia. Sengketa diselesaikan terlebih dahulu secara
        musyawarah. Bila dalam 30 hari tidak tercapai kesepakatan, sengketa diselesaikan melalui Pengadilan Negeri
        Payakumbuh.
      </p>
    ),
  },
  {
    id: 'perubahan',
    title: 'Perubahan syarat',
    body: (
      <p>
        Kami dapat mengubah Syarat &amp; Ketentuan ini. Perubahan penting diberitahukan kepada pemilik klinik paling
        lambat 14 hari sebelum berlaku. Tetap memakai ApexRecord setelah tanggal berlaku berarti menyetujui perubahan
        tersebut.
      </p>
    ),
  },
  {
    id: 'kontak',
    title: 'Hubungi kami',
    body: <CompanyContact />,
  },
];

export default function SyaratKetentuanPage() {
  return (
    <LegalPage
      title="Syarat & Ketentuan"
      current="/syarat-ketentuan"
      intro={
        <p>
          Syarat &amp; Ketentuan ini mengatur penggunaan ApexRecord oleh klinik, praktik mandiri, dan penggunanya. Mohon
          dibaca sebelum mendaftar.
        </p>
      }
      sections={sections}
    />
  );
}
