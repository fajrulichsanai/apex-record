import type { Metadata } from 'next';
import Link from 'next/link';
import LegalPage, { CompanyContact, type LegalSection } from '@/components/legal/LegalPage';
import { COMPANY } from '@/lib/company';

export const metadata: Metadata = {
  title: 'Kebijakan Privasi — ApexRecord',
  description: `Bagaimana ${COMPANY.legalName} mengumpulkan, memakai, menyimpan, dan melindungi data pribadi di ApexRecord.`,
};

const sections: LegalSection[] = [
  {
    id: 'peran',
    title: 'Siapa yang bertanggung jawab atas data',
    body: (
      <>
        <p>
          Sesuai Undang-Undang No. 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP), ada dua peran yang
          berbeda di ApexRecord:
        </p>
        <ul>
          <li>
            <strong>Data pasien dan rekam medis.</strong> Klinik atau praktik yang memakai ApexRecord adalah{' '}
            <strong>Pengendali Data</strong>. Klinik yang menentukan data apa yang dicatat dan untuk apa. {COMPANY.legalName}{' '}
            bertindak sebagai <strong>Prosesor Data</strong> yang menyimpan dan mengolah data tersebut hanya atas
            instruksi klinik.
          </li>
          <li>
            <strong>Data akun pengguna dan data klinik sebagai pelanggan.</strong> {COMPANY.legalName} adalah
            Pengendali Data untuk data pemilik klinik, dokter, dan staf yang memiliki akun, serta data langganan.
          </li>
        </ul>
        <p>
          Pasien yang ingin mengakses, memperbaiki, atau menanyakan data rekam medisnya sebaiknya menghubungi klinik
          tempat ia berobat terlebih dahulu. Kami akan membantu klinik memenuhi permintaan tersebut.
        </p>
      </>
    ),
  },
  {
    id: 'data',
    title: 'Data yang kami kumpulkan',
    body: (
      <>
        <div className="legal-table-wrap">
          <table className="legal-table">
            <thead>
              <tr>
                <th>Jenis data</th>
                <th>Contoh</th>
                <th>Sumber</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Akun pengguna</td>
                <td>Nama, email, password (disimpan sebagai hash), peran, pengaturan verifikasi dua langkah</td>
                <td>Pengguna saat mendaftar atau diundang</td>
              </tr>
              <tr>
                <td>Data klinik</td>
                <td>Nama, alamat, jam operasional, logo, tarif layanan, data dokter dan jadwal praktik</td>
                <td>Pemilik atau admin klinik</td>
              </tr>
              <tr>
                <td>Identitas pasien</td>
                <td>Nama, NIK, tanggal lahir, jenis kelamin, alamat, nomor telepon, email, data wali untuk anak</td>
                <td>Klinik</td>
              </tr>
              <tr>
                <td>Rekam medis (data kesehatan)</td>
                <td>
                  Tanda vital, catatan SOAP, diagnosis ICD-10/SNOMED CT, odontogram, resep, hasil pemeriksaan penunjang,
                  riwayat alergi dan penyakit, informed consent
                </td>
                <td>Dokter dan tenaga kesehatan di klinik</td>
              </tr>
              <tr>
                <td>Transaksi</td>
                <td>Tagihan, pembayaran, diskon, pembayaran langganan beserta buktinya</td>
                <td>Klinik</td>
              </tr>
              <tr>
                <td>Data teknis dan keamanan</td>
                <td>Alamat IP, jenis perangkat/browser, waktu login, catatan siapa membuka atau mengubah data</td>
                <td>Otomatis saat aplikasi dipakai</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Data kesehatan termasuk <strong>data pribadi yang bersifat spesifik</strong> menurut UU PDP, sehingga kami
          memperlakukannya dengan perlindungan tambahan seperti dijelaskan di bagian Keamanan.
        </p>
      </>
    ),
  },
  {
    id: 'tujuan',
    title: 'Untuk apa data dipakai',
    body: (
      <ul>
        <li>Menjalankan layanan: rekam medis, reservasi, transaksi, laporan, dan fitur lain yang dipakai klinik.</li>
        <li>Mengirim data ke SATUSEHAT Kementerian Kesehatan bila klinik mengaktifkan integrasi tersebut.</li>
        <li>Mengelola akun, langganan, dan pembayaran klinik.</li>
        <li>Mengirim email yang diperlukan: verifikasi email, reset password, pengingat recall, dan pengingat masa langganan.</li>
        <li>Menjaga keamanan: mendeteksi login mencurigakan, akses data yang tidak wajar, dan penyalahgunaan.</li>
        <li>Memenuhi kewajiban hukum, termasuk permintaan resmi dari aparat yang berwenang.</li>
      </ul>
    ),
  },
  {
    id: 'dasar',
    title: 'Dasar pemrosesan',
    body: (
      <p>
        Kami memproses data berdasarkan pelaksanaan perjanjian dengan klinik (Syarat &amp; Ketentuan), pemenuhan
        kewajiban hukum (termasuk ketentuan rekam medis dari Kementerian Kesehatan), kepentingan yang sah untuk
        menjaga keamanan layanan, dan persetujuan bila memang diperlukan. Klinik bertanggung jawab memastikan ada dasar
        yang sah untuk data pasien yang dimasukkan ke ApexRecord.
      </p>
    ),
  },
  {
    id: 'pihak-ketiga',
    title: 'Pihak ketiga yang menerima data',
    body: (
      <>
        <p>Kami tidak menjual data pribadi dan tidak memakai data pasien untuk iklan. Data hanya dibagikan kepada:</p>
        <ul>
          <li>
            <strong>SATUSEHAT (Kementerian Kesehatan RI)</strong>: data pasien, kunjungan, dan diagnosis, hanya bila
            klinik mengaktifkan integrasi.
          </li>
          <li>
            <strong>Penyedia server dan penyimpanan file</strong>: tempat aplikasi, database, dan file seperti foto
            rontgen atau bukti pembayaran disimpan.
          </li>
          <li>
            <strong>Resend</strong>: layanan pengiriman email untuk verifikasi, reset password, dan pengingat.
          </li>
          <li>
            <strong>Google Fonts</strong>: saat halaman dimuat, browser mengambil file huruf dari Google, sehingga alamat
            IP perangkat terlihat oleh Google. Tidak ada data pasien yang dikirim.
          </li>
          <li>
            <strong>Website klinik</strong>: bila klinik membuat API key, website klinik dapat menampilkan jadwal dokter
            dan menerima reservasi. API ini tidak membuka data rekam medis.
          </li>
        </ul>
        <p>ApexRecord tidak memakai Google Analytics, Meta Pixel, atau alat pelacak iklan lain.</p>
      </>
    ),
  },
  {
    id: 'keamanan',
    title: 'Keamanan data',
    body: (
      <>
        <ul>
          <li>Semua koneksi ke ApexRecord memakai HTTPS.</li>
          <li>Password disimpan sebagai hash bcrypt, tidak pernah dalam bentuk aslinya.</li>
          <li>NIK pasien dan NIK dokter dienkripsi sebelum disimpan di database.</li>
          <li>Akun pemilik klinik dan super admin wajib memakai verifikasi dua langkah (MFA).</li>
          <li>Login yang berkali-kali gagal dikunci sementara; logout dan ganti password mencabut sesi lama.</li>
          <li>Akses dibatasi sesuai peran (dokter, admin, pemilik), dan akses maupun perubahan rekam medis dicatat di audit log.</li>
        </ul>
        <p>
          Bila terjadi kegagalan pelindungan data pribadi, kami akan memberi tahu klinik yang terdampak dan pihak yang
          diwajibkan UU PDP paling lambat 3 x 24 jam setelah mengetahuinya.
        </p>
      </>
    ),
  },
  {
    id: 'penyimpanan',
    title: 'Berapa lama data disimpan',
    body: (
      <ul>
        <li>
          <strong>Rekam medis</strong> disimpan selama klinik berlangganan. Klinik wajib menyimpan rekam medis minimal
          25 tahun sejak kunjungan terakhir pasien sesuai Peraturan Menteri Kesehatan No. 24 Tahun 2022. Karena itu,
          pasien yang sudah memiliki riwayat kunjungan tidak dapat dihapus dari aplikasi.
        </li>
        <li>
          <strong>Setelah langganan berakhir</strong>, data klinik tetap tersimpan dan dapat dilihat (mode hanya-baca)
          agar klinik tetap dapat memenuhi kewajiban penyimpanan rekam medis. Klinik dapat meminta ekspor seluruh data
          atau penghapusan akun seperti dijelaskan di bagian Hak Anda.
        </li>
        <li>
          <strong>Data akun pengguna</strong> disimpan selama akun aktif. Audit log keamanan disimpan selama diperlukan
          untuk keamanan dan kewajiban hukum.
        </li>
      </ul>
    ),
  },
  {
    id: 'hak',
    title: 'Hak Anda dan cara meminta penghapusan data',
    body: (
      <>
        <p>Sesuai UU PDP, Anda berhak untuk:</p>
        <ul>
          <li>mendapat informasi tentang data pribadi Anda dan cara pemrosesannya;</li>
          <li>mengakses dan mendapatkan salinan data pribadi Anda;</li>
          <li>memperbaiki data yang salah atau tidak lengkap;</li>
          <li>meminta penghapusan data, atau menarik persetujuan yang pernah diberikan;</li>
          <li>mengajukan keberatan atas pemrosesan tertentu.</li>
        </ul>
        <h3>Cara mengajukan</h3>
        <ol>
          <li>
            <strong>Pasien</strong>: hubungi klinik tempat Anda berobat. Klinik dapat memperbaiki data langsung di
            aplikasi atau meneruskan permintaan ke kami.
          </li>
          <li>
            <strong>Pengguna atau pemilik klinik</strong>: kirim email ke <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>{' '}
            dengan subjek &quot;Permintaan Data Pribadi&quot;, sebutkan nama klinik, email akun, dan permintaan Anda.
          </li>
        </ol>
        <p>
          Kami akan memverifikasi identitas pemohon dan menanggapi paling lambat 3 x 24 jam. Permintaan hapus rekam
          medis yang masih wajib disimpan menurut hukum tidak dapat dipenuhi sampai masa simpannya berakhir; dalam hal
          itu kami akan menjelaskan alasannya.
        </p>
      </>
    ),
  },
  {
    id: 'cookie',
    title: 'Cookie',
    body: (
      <>
        <p>ApexRecord hanya memakai cookie yang diperlukan agar aplikasi berfungsi:</p>
        <ul>
          <li>
            <strong>Cookie sesi login</strong> (httpOnly), untuk menjaga Anda tetap masuk dengan aman.
          </li>
          <li>
            <strong>Cookie peran pengguna</strong>, untuk mengarahkan Anda ke halaman yang sesuai.
          </li>
          <li>
            <strong>Penyimpanan lokal browser</strong> untuk preferensi seperti tema terang/gelap.
          </li>
        </ul>
        <p>
          Kami tidak memakai cookie iklan atau pelacak. Karena itu tidak ada banner persetujuan cookie. Jika kelak kami
          menambahkan cookie non-esensial, kami akan meminta persetujuan Anda terlebih dahulu.
        </p>
      </>
    ),
  },
  {
    id: 'anak',
    title: 'Data anak',
    body: (
      <p>
        ApexRecord tidak ditujukan untuk dipakai langsung oleh anak. Data pasien anak dimasukkan oleh klinik, dan untuk
        pasien di bawah 17 tahun aplikasi mewajibkan pengisian nama serta hubungan wali. Klinik bertanggung jawab
        mendapatkan persetujuan orang tua atau wali sesuai ketentuan yang berlaku.
      </p>
    ),
  },
  {
    id: 'perubahan',
    title: 'Perubahan kebijakan',
    body: (
      <p>
        Kebijakan ini dapat diperbarui. Tanggal berlaku di bagian atas halaman akan diubah, dan untuk perubahan penting
        kami memberi tahu pemilik klinik melalui email atau pemberitahuan di aplikasi. Lihat juga{' '}
        <Link href="/syarat-ketentuan">Syarat &amp; Ketentuan</Link>.
      </p>
    ),
  },
  {
    id: 'kontak',
    title: 'Hubungi kami',
    body: (
      <>
        <p>Pertanyaan tentang kebijakan ini atau data pribadi Anda dapat dikirim ke:</p>
        <CompanyContact />
      </>
    ),
  },
];

export default function KebijakanPrivasiPage() {
  return (
    <LegalPage
      title="Kebijakan Privasi"
      current="/kebijakan-privasi"
      intro={
        <p>
          ApexRecord adalah aplikasi manajemen klinik yang dikelola oleh {COMPANY.legalName}. Kebijakan ini menjelaskan
          data apa yang kami kumpulkan, untuk apa, kepada siapa dibagikan, bagaimana kami melindunginya, dan hak Anda
          atas data tersebut.
        </p>
      }
      sections={sections}
    />
  );
}
