# ApexRecord — Konten IG "Warm Minimal"

Seri 6 slide (carousel atau 6 post feed), palet disamakan dengan landing page staging
(`app/landingpage/landingpage.css` di branch `dev-daffa`).

| Token | Hex | Pakai untuk |
|---|---|---|
| Background | `#EEECE6` | latar krem |
| Background deep | `#E4E1D8` | panel sekunder |
| Surface | `#FFFFFF` | kartu |
| Ink | `#17160F` | teks utama, tombol gelap, slide CTA |
| Ink-2 / Ink-3 | `#55534A` / `#8D8B7E` | teks sekunder |
| Accent | `#3E8E36` | kata kunci hijau |
| Accent solid | `#7ED957` | stabilo / highlight, tombol CTA |
| Accent soft | `#E3F3DA` | badge lembut |

Font: **Inter Tight** (judul, ExtraBold), **Inter** (isi), **JetBrains Mono** (label kecil).

File: `01.png` … `06.png` sudah siap upload (1080×1350). Ubah teks di `posts.html`, lalu `node render.js`.

> Urutan upload feed (kalau dipost terpisah): upload **06 dulu**, terakhir **01**, supaya di grid terbaca 01→06 dari kiri atas.

---

## Prompt ChatGPT (kalau ingin versi gambar AI / variasi)

Tempel **Style base** dulu di setiap prompt, lalu tambahkan prompt slide-nya.
Lampirkan juga `01.png` sebagai referensi gaya agar hasilnya konsisten.

**Style base**

```
Instagram post, 1080x1350 (4:5). Warm-minimal SaaS style, clean and editorial.
Background warm off-white #EEECE6 with a very faint square grid fading out from the top,
soft lime-green radial glow (#7ED957, low opacity) in one corner.
Typography: Inter Tight ExtraBold for headlines, tight letter spacing, near-black #17160F;
key words in green #3E8E36 or with a lime marker highlight #7ED957 behind them.
White rounded cards (radius ~28px) with subtle soft shadow. Small monospace uppercase labels
in gray #8D8B7E. Top-left: black rounded-square logo mark with a white "A" + wordmark
"ApexRecord" ("Record" in green). Bottom: thin divider line, "apexrecord.my.id" left, page number right.
NO blue, NO neon, NO dark sci-fi glow, NO stock photos, NO 3D. All text in Bahasa Indonesia, spelled exactly as given.
```

**Slide 1 — Hero**
```
Headline (4 lines, huge): "Kelola klinik / & praktik Anda / tanpa drama / administrasi."
— "drama" has lime highlight, "administrasi." in green.
Above it a white pill badge with green dot: "Klinik Pratama · Klinik Utama · TPMD · TPMDG".
Subtext: "Rekam medis, jadwal, kasir, sampai laporan keuangan — semuanya dalam satu sistem."
Three stat cards in a row: "15 hari – uji coba gratis", "< 10 menit – setup sampai aktif",
and a black card "Rp150rb – mulai / bulan" (number in lime green). Page "01 / 06".
```

**Slide 2 — Masalah**
```
Top-right label "MASALAH YANG FAMILIAR?". Headline: "Masih kelola klinik lewat Excel, WA, dan buku catatan?"
("Excel" and "WA" with lime highlight). Three stacked white cards, each with a small pastel icon tile:
1) red-pink tile, document icon — "Rekam medis tercecer" / "Riwayat tindakan, odontogram & resep tersebar di kertas dan chat."
2) amber tile, calendar icon — "Jadwal & antrian bentrok" / "Booking lewat telepon atau buku sering tumpang-tindih."
3) light-blue tile, chart icon — "Tidak tahu untung berapa" / "Margin per tindakan, fee dokter & biaya bahan tidak pernah dihitung."
Bottom-left "Geser untuk solusinya →", page "02 / 06".
```

**Slide 3 — Alur kerja**
```
Headline: "4 langkah." (black) / "Semua tercatat." (green).
Vertical timeline on the left with black circles "01", "02", "03" and a final lime circle with a checkmark,
connected by a thin gray line. Each step is a white card:
"Pasien datang – Registrasi dalam 30 detik", "Kunjungan dibuat – Dokter & tindakan langsung tercatat",
"SOAP + tindakan – Rekam medis terisi otomatis". Last card is black: "Bayar — selesai" ("selesai" lime),
"Invoice terkirim · stok & laporan ter-update". Page "03 / 06".
```

**Slide 4 — Laporan Keuangan Pro**
```
Small gray line: "Bukan cuma kasir digital." Big headline: "Ini intelijen bisnis klinik Anda."
("intelijen bisnis" lime highlight). A large white dashboard card: title "Heatmap jam kunjungan",
label "SEN–SAB", a 6x12 grid of rounded cells in green shades (light cream to deep #2B6B22,
busiest around late afternoon). Below it three small stat tiles: "LTV : CAC 4,2×", "Retensi 90 hari 62%" (green),
"Jam tersibuk 17.00". Caption: "Heatmap jam ramai · peta sebaran pasien per kecamatan · PDF siap kirim ke akuntan."
Bottom-left small note "*Ilustrasi data contoh", page "04 / 06".
```

**Slide 5 — Setup 3 langkah**
```
Pill badge "Setup aktif < 10 menit". Headline: "Siap beroperasi dalam 3 langkah." ("3 langkah" lime highlight).
Three white cards with a large lime outlined number on the left:
"1 Lengkapi info klinik – Nama, alamat, jam buka & logo.", "2 Atur tarif layanan – Tambahkan tindakan & harga.",
"3 Undang dokter – Dokter langsung dapat akun, siap terima pasien pertama."
Bottom-left "Tanpa training berhari-hari", page "05 / 06".
```

**Slide 6 — CTA (versi gelap)**
```
Dark version: background #17160F with faint white grid and a lime glow in the center.
Centered: large green rounded-square app icon with white "A". Headline in off-white:
"Klinik Anda layak dikelola lebih rapi." ("lebih rapi." in lime #7ED957).
Subtext: "15 hari gratis · tanpa kartu kredit · mulai Rp150rb/bulan".
Lime pill button with black text "Mulai uji coba gratis →", below it "apexrecord.my.id" in monospace.
Bottom-left "DM "DEMO" untuk jadwal presentasi", page "06 / 06".
```

---

## Caption (carousel)

```
Masih ngurus klinik pakai Excel, chat WA, dan buku catatan? 📒

ApexRecord menyatukan semuanya dalam satu sistem:
✅ Rekam medis & SOAP tercatat otomatis
✅ Jadwal, antrian & kasir tanpa bentrok
✅ Laporan Keuangan Pro — heatmap jam ramai, retensi pasien, LTV:CAC
✅ Setup aktif < 10 menit

Untuk Klinik Pratama, Klinik Utama, TPMD & TPMDG.
Coba gratis 15 hari, tanpa kartu kredit 👉 apexrecord.my.id
Atau DM "DEMO" untuk jadwal presentasi.

#ApexRecord #SoftwareKlinik #RekamMedisElektronik #ManajemenKlinik #KlinikGigi #KlinikPratama #TPMDG #SatuSehat
```

## Ide konten lanjutan (warna yang sama)

1. **Before/After** — "Dulu vs Sekarang" (versi krem dari post lama "Masih begini?").
2. **Untuk siapa?** — 3 kartu: Dokter & Dokter Gigi / Owner Klinik / Admin.
3. **Fitur spotlight** — Odontogram digital, Invoice PDF via WhatsApp, Stok otomatis (1 fitur per post).
4. **FAQ carousel** — ambil dari bagian "Pertanyaan umum" di landing page.
5. **Terintegrasi Satu Sehat** — kepercayaan & kepatuhan regulasi.
