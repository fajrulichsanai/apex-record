/**
 * Pertanyaan umum landing page. Dipakai dua tempat: bagian FAQ di halaman dan
 * structured data FAQPage (JSON-LD) untuk mesin pencari, jadi isinya cukup
 * diubah di sini. Teks polos saja (tanpa JSX) agar bisa dibaca dari server.
 *
 * Enam pertanyaan pertama menjawab hal yang benar-benar dicari orang di
 * Google: SIM klinik, rekam medis elektronik (RME / E-RM), kewajiban RME,
 * dan aplikasi klinik gigi.
 */
export const FAQS: { q: string; a: string; open?: boolean }[] = [
  {
    q: 'Apa itu SIM Klinik (Sistem Informasi Manajemen Klinik)?',
    a: 'SIM Klinik adalah aplikasi yang menyatukan pekerjaan harian klinik dalam satu sistem: pendaftaran dan data pasien, reservasi, rekam medis, resep dan farmasi, kasir, stok, hingga laporan. ApexRecord adalah SIM Klinik berbasis web untuk Klinik Pratama, Klinik Utama, TPMD, dan TPMDG, jadi bisa dibuka dari komputer, tablet, maupun ponsel tanpa instalasi.',
    open: true,
  },
  {
    q: 'Apa itu rekam medis elektronik (RME atau E-RM)?',
    a: 'Rekam medis elektronik (RME, sering juga ditulis E-RM atau ERM) adalah rekam medis pasien yang dicatat dan disimpan secara digital, menggantikan berkas kertas. Di ApexRecord, dokter mencatat anamnesis, pemeriksaan, diagnosis ICD-10 atau SNOMED CT, tindakan, dan resep dalam format SOAP. Riwayat pasien mudah dicari kembali dan akses datanya diatur berdasarkan peran.',
  },
  {
    q: 'Apakah klinik wajib memakai rekam medis elektronik?',
    a: 'Ya. Permenkes No. 24 Tahun 2022 tentang Rekam Medis mewajibkan fasilitas pelayanan kesehatan, termasuk klinik, menyelenggarakan rekam medis elektronik. ApexRecord membantu klinik beralih dari berkas kertas ke RME tanpa perlu menyiapkan server sendiri.',
  },
  {
    q: 'Apa bedanya SIM klinik dan RME?',
    a: 'RME khusus mencatat data medis pasien. SIM Klinik lebih luas: mencakup RME dan juga reservasi, kasir, farmasi dan stok, serta laporan keuangan. ApexRecord menggabungkan keduanya, sehingga data pasien, tagihan, dan laporan tidak perlu diinput dua kali.',
  },
  {
    q: 'Aplikasi klinik apa yang cocok untuk dokter gigi?',
    a: 'ApexRecord menyediakan odontogram interaktif, 18 template catatan gigi siap pakai, rencana perawatan, dan informed consent digital, sehingga cocok untuk klinik gigi maupun praktik mandiri dokter gigi (TPMDG). Dokter umum (TPMD) dan Klinik Pratama atau Utama juga bisa memakainya.',
  },
  {
    q: 'Berapa harga aplikasi klinik ApexRecord?',
    a: 'Ada uji coba gratis 14 hari tanpa kartu kredit. Setelah itu tersedia paket Starter, Pro, dan Multi Klinik. Fiturnya sama di Starter dan Pro, bedanya di kapasitas. Harga terbaru, termasuk promo, ada di bagian Harga pada halaman ini.',
  },

  {
    q: 'Data pasien saya aman?',
    a: 'Ya. Semua koneksi memakai HTTPS, NIK pasien dienkripsi sebelum disimpan, password tidak pernah disimpan dalam bentuk aslinya, akses diatur berdasarkan peran (dokter, admin, owner), login yang berulang kali gagal dikunci sementara, serta akses dan perubahan rekam medis tercatat di audit log.',
  },
  {
    q: 'Apakah ApexRecord cocok untuk praktik mandiri (TPMD/TPMDG)?',
    a: 'Sangat cocok. Baik Anda praktik sendirian sebagai dokter umum (TPMD) maupun dokter gigi (TPMDG), atau mengelola Klinik Pratama/Utama dengan banyak tenaga medis, ApexRecord menyesuaikan — mulai dari satu akun dokter hingga puluhan.',
  },
  {
    q: 'Bagaimana kalau saya sudah punya data pasien lama?',
    a: 'Tim kami dapat membantu proses migrasi data dari sistem atau spreadsheet Anda sebelumnya. Hubungi kami setelah mendaftar untuk dipandu prosesnya.',
  },
  {
    q: 'Apakah bisa dipakai untuk lebih dari satu cabang klinik?',
    a: 'Bisa. Role Multi-Klinik Owner memberi Anda satu dashboard untuk memantau performa seluruh cabang sekaligus, tanpa perlu login bergantian.',
  },
  {
    q: 'Apakah diagnosis sudah memakai standar ICD-10 dan SNOMED CT?',
    a: 'Sudah. Saat mengisi Assessment di catatan SOAP, dokter bisa mencari diagnosis ICD-10 (18.500+ kode) atau SNOMED CT (499.000+ konsep) lewat kode, nama resmi, maupun nama sehari-hari dalam bahasa Indonesia — misalnya “gigi berlubang” atau “radang gusi” — lengkap dengan penjelasannya.',
  },
  {
    q: 'Bisakah jadwal dokter dan reservasi tampil di website klinik saya?',
    a: 'Bisa. Buat API key di Pengaturan → API, lalu tim IT atau pembuat website Anda tinggal menampilkan jam buka, profil & jadwal dokter, layanan, slot kosong, dan formulir reservasi. Dokumentasinya tersedia langsung di halaman tersebut. Kuota request mengikuti paket langganan.',
  },
  {
    q: 'Apakah pasien bisa bayar DP dulu?',
    a: 'Bisa. Saat membuat tagihan, pilih Lunas, DP, atau Bayar Nanti. Sisa tagihan terlihat jelas di daftar transaksi dan bisa dilunasi kapan saja lewat tombol Pelunasan, dengan metode bayar yang berbeda sekalipun. Laporan keuangan menampilkan berapa tagihan yang masih DP dan sisa piutangnya.',
  },
  {
    q: 'Bagaimana dengan kunjungan kontrol yang tidak ditagih lagi?',
    a: 'Misalnya kontrol lanjutan yang sudah dibayar di awal atau konsultasi gratis. Buat tagihan Rp 0 dan langsung tercatat lunas, jadi kunjungannya tetap masuk rekam medis dan laporan kunjungan, dan di laporan keuangan tampil sebagai kunjungan gratis.',
  },
  {
    q: 'Kalau berhenti berlangganan, data klinik saya bagaimana?',
    a: 'Data tetap milik klinik. Pemilik klinik bisa mengunduh semua data (Excel dan berkas foto) kapan saja dari menu Pengaturan → Data & Privasi. Setelah langganan berakhir, data masih bisa dilihat dan diunduh selama 15 hari, lalu dihapus permanen — kecuali Anda berlangganan lagi sebelum itu.',
  },
  {
    q: 'Apa yang terjadi setelah masa uji coba 14 hari berakhir?',
    a: 'Selama 14 hari, minggu pertama Anda memakai batas paket Starter dan minggu kedua otomatis naik ke batas Pro, dengan storage 100 MB. Setelah itu Anda bisa melanjutkan dengan memilih salah satu paket. Tidak ada penagihan otomatis diam-diam — Anda yang memutuskan kapan melanjutkan.',
  },
  {
    q: 'Apa beda paket Starter dan Pro?',
    a: 'Fiturnya sama persis — semua fitur aplikasi ada di kedua paket. Bedanya di kapasitas: Starter untuk 5 akun pengguna, storage 1 GB, dan API 1.000 request/hari; Pro untuk 25 akun, storage 5 GB, API 10.000 request/hari, plus dukungan prioritas. Anda bisa naik paket kapan saja dengan membayar selisih untuk sisa hari langganan.',
  },
  {
    q: 'Kami punya beberapa cabang klinik. Bagaimana caranya?',
    a: 'Pilih paket Multi Klinik: semua cabang dikelola dari satu akun owner dengan dashboard dan laporan gabungan, plus Manajer Cabang untuk tiap klinik. Harga dan penagihannya disesuaikan dengan jumlah cabang — hubungi tim ApexRecord lewat WhatsApp, kami akan memandu aktivasinya.',
  },
];
