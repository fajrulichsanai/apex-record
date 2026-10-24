# Rancangan: Lembar Perawatan Kustom (Custom Treatment Sheet)

Status: **usulan, belum dikerjakan** · Dibahas: 24 Okt 2026
Cakupan: backend NestJS (`Satu Sehat Integration`) + frontend ApexRecord (repo ini)

## 1. Tujuan

Owner klinik dapat **membuat sendiri bentuk lembar perawatan** lewat drag and drop,
tanpa programmer. Behel, perio, bedah, atau format apa pun yang diinginkan dokter.
Lembar "Status Perawatan" behel yang difoto hanyalah **satu contoh template**,
bukan format yang dikunci.

Prinsip:

1. **Tidak ada format yang di-hardcode.** Semua bentuk berasal dari template yang disusun dari komponen dasar.
2. **Semua isian bertanda waktu dan tercatat** (siapa, kapan, apa yang berubah). Log tidak bisa diedit atau dihapus.
3. **Semua isian bisa dibawa ke bagian Objektif** pada lembar SOAP.
4. **Tidak mengganggu Satu Sehat.** Diagnosis (ICD-10) dan tindakan (ICD-9) tetap lewat modul yang ada.

## 2. Temuan dari kode saat ini

| Temuan | Dampak |
|---|---|
| `soap_templates` hanya 4 kolom teks (S, O, A, P) | Bukan formulir; tetap dipakai terpisah |
| Data kunjungan berupa tabel baku: `anamnesis`, `odontogram_data`, `ohis_data`, `vital_signs`, `diagnoses`, `procedures` | Tetap dipertahankan; lembar kustom menambah, tidak menggantikan |
| Pola izin template: owner boleh membagikan (`isShared`), dokter hanya pribadi | Diikuti, lihat bagian 8 |
| Entity memakai `BaseEntity` (`createdAt/By`, `updatedAt/By`) | Dipakai lagi |
| Belum ada tempat penyimpanan teks SOAP selain template | **Perlu dikonfirmasi**: di mana teks S/O/A/P kunjungan disimpan? Lihat bagian 11 |
| Di repo frontend ini belum ada layar rekam medis/SOAP | Layar baru dibuat, mengikuti pola route group yang ada |

## 3. Konsep inti

Lembar kertas behel punya dua jenis isian:

- **Sekali isi per pasien** (kepala lembar): nama, ukuran band, jenis bracket dan slot, tabel tinggi bracket.
- **Berulang tiap kunjungan** (tabel di bawah): tanggal, kebersihan mulut, archwire, deskripsi, kunjungan berikut.

Maka setiap bagian di template punya **cakupan (scope)**:

| Scope | Arti | Tampil sebagai |
|---|---|---|
| `case` | diisi sekali, bisa diperbarui | bagian kepala lembar |
| `visit` | diisi di setiap kunjungan | baris baru di tabel kunjungan |

Satu template bisa campuran keduanya (behel), hanya `visit` (kontrol sederhana),
atau hanya `case` (formulir sekali isi).

Alur:

```
Owner menyusun template (draft) → publish (jadi versi yang dibekukan)
→ dokter memilih template untuk pasien → "lembar pasien" dibuat
→ tiap kunjungan dokter menambah "entri kunjungan"
→ lembar dapat dirender ke Objektif SOAP, dicetak/PDF
```

## 4. Komponen (blok)

Template adalah daftar blok. Tiap blok punya: `id`, `type`, `label`, `scope`, `required`, lebar kolom (1–12), dan properti sesuai jenis.

| Blok | Fungsi | Properti utama |
|---|---|---|
| `heading` / `note` | judul dan keterangan statis | teks |
| `text` | teks pendek | placeholder, maks. panjang |
| `textarea` | teks panjang | baris, penanda cepat (mis. `R:`, `K/`, `Th/:`) |
| `number` | angka | satuan (mm, %), min/maks, desimal |
| `select` | satu pilihan | daftar pilihan (bisa diubah owner) |
| `multiselect` / `checkbox` | beberapa pilihan / ya-tidak | daftar pilihan |
| `date` | tanggal | otomatis hari ini |
| `photo` | foto/lampiran | jumlah maks. |
| `pair_ul` | pasangan **atas/bawah** (U/L) | jenis isian di dalamnya (mis. archwire) |
| `tooth_table` | tabel per gigi | label kolom, label baris, jenis isi sel |
| `tooth_chart` | **bagan gigi visual** | sistem penomoran, daftar status per gigi (mis. bracket, band, lepas) |
| `perio_chart` (tahap 2) | bagan perio | 6 titik per gigi: kedalaman saku, resesi, perdarahan, kegoyangan, furkasi |

Catatan: `tooth_table` menjawab baris **RA / RB × gigi 1–7** (tinggi bracket) dan
baris **ukuran band**. Label baris dan kolom bebas ditentukan owner, jadi cocok
untuk format lain juga.

Blok **`visit`-scope** otomatis menjadi kolom tabel kunjungan. Owner mengatur urutan dan lebar kolom.

## 5. Struktur data

Semua tabel mengikuti `BaseEntity` dan selalu memuat `clinic_id`.

### `sheet_templates`
| Kolom | Keterangan |
|---|---|
| `clinic_id`, `name`, `description` | |
| `status` | `draft` / `published` / `archived` |
| `current_version_id` | versi terbit terakhir |
| `is_shared` | tampil untuk semua dokter klinik |

### `sheet_template_versions` (tidak bisa diubah)
| Kolom | Keterangan |
|---|---|
| `template_id`, `version` (1, 2, 3 …) | |
| `schema` (JSON) | susunan blok, lihat bagian 6 |
| `published_by`, `published_at` | |

Mengubah template yang sudah terbit membuat **versi baru**. Lembar lama tetap
memakai versi yang dulu dipilih, sehingga rekam medis lama tidak berubah.

### `patient_sheets` (lembar milik satu pasien)
| Kolom | Keterangan |
|---|---|
| `clinic_id`, `patient_id`, `template_version_id` | |
| `title` | mis. "Behel 2026" |
| `status` | `open` / `closed` |
| `case_data` (JSON) | isian blok `case` |

### `patient_sheet_entries` (satu baris kunjungan)
| Kolom | Keterangan |
|---|---|
| `sheet_id`, `encounter_id` (opsional), `practitioner_id` | |
| `entry_at` | tanggal-jam kunjungan, diisi otomatis |
| `visit_data` (JSON) | isian blok `visit` |
| `locked_at`, `locked_by` | terisi saat kunjungan diselesaikan |

### `sheet_audit_log` (hanya bisa ditambah)
| Kolom | Keterangan |
|---|---|
| `clinic_id`, `sheet_id`, `entry_id` (bisa kosong) | |
| `action` | `create` / `update` / `lock` / `correct` |
| `field_path` | mis. `visit_data.archwire.U` |
| `old_value`, `new_value` (JSON) | |
| `reason` | wajib bila `correct` |
| `user_id`, `created_at` | siapa dan kapan |

Aplikasi tidak menyediakan API ubah atau hapus untuk tabel ini. Bila memungkinkan,
akun database aplikasi hanya diberi izin `INSERT` dan `SELECT` pada tabel ini.

## 6. Contoh skema (lembar behel dari foto)

```json
{
  "layout": "grid-12",
  "blocks": [
    { "id": "bracket", "type": "text",  "label": "Macam bracket & slot", "scope": "case", "width": 12 },
    { "id": "band", "type": "tooth_table", "label": "Ukuran band/bond", "scope": "case",
      "cols": ["7/8","6","5","4","3","2","1"], "rows": ["Atas","Bawah"], "cell": { "type": "text" } },
    { "id": "height", "type": "tooth_table", "label": "Tinggi bracket (mm)", "scope": "case",
      "cols": ["1","2","3","4","5","6","7"], "rows": ["RA","RB"], "cell": { "type": "number", "unit": "mm", "decimals": 1 } },

    { "id": "hyg", "type": "select", "label": "Hyg.", "scope": "visit", "options": ["Baik","Sedang","Buruk"], "width": 2 },
    { "id": "aw",  "type": "pair_ul", "label": "A/W", "scope": "visit", "cell": { "type": "text" }, "width": 3 },
    { "id": "desc","type": "textarea","label": "Deskripsi perawatan", "scope": "visit", "width": 5 },
    { "id": "next","type": "text",    "label": "Kunjungan berikut", "scope": "visit", "width": 2 }
  ]
}
```

Tanggal/jam dan operator tidak perlu dibuat sebagai blok: selalu otomatis dari `entry_at` dan `practitioner_id`.
Pilihan isi **Hyg** pada contoh hanya tebakan; owner bebas mengubahnya.

Dokter yang ingin melihat gigi cukup menambah blok `tooth_chart`. Yang tidak mau, tidak memasangnya.

## 7. Pembuat template (builder)

Halaman baru: `app/(settings)/lembar-perawatan/` dengan tiga panel:

1. **Daftar komponen** di kiri (ditarik ke kanvas).
2. **Kanvas** di tengah: atur urutan dengan drag and drop, atur lebar kolom.
3. **Properti** di kanan: label, satuan, pilihan, wajib diisi, `case`/`visit`.

Fitur: pratinjau sebagai dokter, simpan draft, **publish**, salin template, arsipkan,
dan **template contoh** (behel dari foto, kontrol sederhana) yang bisa disalin lalu diubah.

Teknis: pustaka drag and drop `@dnd-kit` (mendukung React 19). Builder dioptimalkan
untuk komputer dan tablet; mengisi lembar harus nyaman di HP.

## 8. Izin akses

Mengikuti pola `soap_templates` dan peran yang ada (`owner`, `admin`, `dokter`):

| Aksi | Owner | Admin | Dokter |
|---|---|---|---|
| Buat, ubah, publish, arsipkan template | ya | tidak | tidak (tahap 3: salinan pribadi) |
| Lihat template terbit | ya | ya | ya |
| Buat lembar & isi entri kunjungan | ya | tidak | ya |
| Koreksi entri terkunci (dengan alasan) | ya | tidak | dokter yang bersangkutan |
| Lihat log | ya | tidak | pada lembar yang ia tangani |

Semua query dibatasi `clinic_id` lewat `ClinicContextGuard` seperti modul lain.
Peran admin untuk rekam medis masih perlu dikonfirmasi (bagian 11).

## 9. Ekspor ke lembar SOAP (Objektif)

Semua blok masuk bagian **O**, dikelompokkan per blok dengan judul:

| Blok | Hasil di teks Objektif |
|---|---|
| text, number, select | `Label: nilai` |
| pair_ul | `A/W: U 014 CuNiti, L 014 CuNiti` |
| tooth_table | tabel kecil: `RA: 1=4.0, 2=3.5 …` |
| tooth_chart | daftar `gigi 12: bracket, 13: band …` + gambar bagan bila dicetak |
| textarea | apa adanya |
| photo | dicantumkan sebagai lampiran |

Cara kerja: tombol **"Masukkan ke Objektif"** menyusun teks, dokter dapat
mengeditnya, lalu menyimpan. Teks hasil edit tidak mengubah data lembar aslinya.
Bila nanti ingin memindah satu blok ke S, A, atau P, cukup ditambah satu properti `soapSection`.

## 10. Cap waktu dan log

- Setiap entri punya `entry_at`. Setiap perubahan tercatat di `sheet_audit_log` dengan pengguna, waktu, nilai lama dan baru.
- Ketika kunjungan diselesaikan, entri **dikunci**. Perubahan setelahnya hanya lewat **koreksi** yang wajib berisi alasan; nilai lama tetap tampil di riwayat.
- Tidak ada penghapusan permanen. Lembar dan entri yang salah ditandai batal/arsip, bukan dihapus.
- Foto dan lampiran ikut tercatat.
- Aturan rekam medis elektronik (retensi, hak akses, audit) **perlu dicek ulang** dengan ketentuan yang berlaku sebelum rilis.

## 11. Pertanyaan yang belum terjawab

1. Di mana teks SOAP (S/O/A/P) per kunjungan disimpan saat ini? Di backend hanya ada `soap_templates`.
2. Apakah admin boleh melihat rekam medis klinis, atau hanya dokter dan owner?
3. Isi kolom **Hyg** dan arti `AA/RA` di lembar behel.
4. Contoh lembar perio dan format dokter lain, supaya `perio_chart` tepat.
5. Pilihan sistem penomoran gigi pada bagan: FDI saja atau juga Palmer/Universal?
6. Foto dan lampiran: disimpan di mana (belum ada penyimpanan file di kode yang saya lihat)?

## 12. Tahapan

| Tahap | Isi | Hasil yang bisa dicoba |
|---|---|---|
| **1** | Tabel template/versi/lembar/entri/log; API; builder dengan komponen dasar (text, number, select, textarea, date, pair_ul, tooth_table); isi lembar; log; ekspor ke Objektif; cetak PDF | Lembar behel dari foto bisa dibuat ulang dan diisi |
| **2** | `tooth_chart` visual, salin dari kunjungan sebelumnya, riwayat per kunjungan, foto | Behel dengan tampilan gigi |
| **3** | `perio_chart`, template contoh lain, salinan pribadi dokter, berbagi antar klinik | Lembar perio |

## 13. Risiko

- **Builder drag and drop adalah bagian terbesar.** Tahap 1 sengaja memakai komponen sederhana.
- **Fleksibel berarti laporan antar template sulit digabung.** Data baku tetap lewat modul diagnosis/tindakan.
- **Bagan gigi dan perio di layar kecil** butuh uji nyata di HP.
- **Template berubah di tengah perawatan** teratasi dengan versi yang dibekukan, tetapi owner perlu paham bahwa lembar lama tidak ikut berubah.
