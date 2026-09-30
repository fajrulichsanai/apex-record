# Promo Bento — ApexRecord

Materi promosi landscape bergaya bento grid. Warna, font, dan logo mengikuti landing page
(`app/landingpage/landingpage.css` di branch `development`) dan seri konten Instagram:
beige `#EEECE6` / ink `#17160F`, aksen lime `#7ED957`, Inter Tight + Inter + JetBrains Mono.

## Output (`output/`)

| File | Ukuran | Isi |
|---|---|---|
| `apexrecord-01-rekam-medis-{light,dark}.png` | 1920×1080 | Diagnosis ICD-10/SNOMED CT, odontogram, reservasi & antrian, gudang & farmasi, SATUSEHAT, informed consent |
| `apexrecord-02-laporan-bisnis-{light,dark}.png` | 1920×1080 | Heatmap & KPI Laporan Keuangan Pro, fee share dokter, tarif & margin, multi-cabang, keamanan data, API website |
| `*@2x.png` | 3840×2160 | Versi resolusi tinggi dari file di atas |

## Render ulang

```bash
node promo/render.mjs
```

Butuh Playwright (lokal atau global). Konten tiap slide ada di `bento.html` (objek `SLIDES`).
Preview di browser: `bento.html?s=klinis&theme=dark` (`s` = `klinis` | `bisnis`, `theme` = `light` | `dark`).

Angka dan nama pada gambar adalah data ilustrasi.
