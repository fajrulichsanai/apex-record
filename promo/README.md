# Promo Bento — ApexRecord

Materi promosi gaya "bento grid" (ala keynote Apple) yang merangkum fitur utama ApexRecord.

## Output (`output/`)

| File | Ukuran | Kegunaan |
|---|---|---|
| `apexrecord-ig-portrait-{light,dark}.png` | 1080×1350 (4:5) | Feed Instagram (portrait, rekomendasi) |
| `apexrecord-ig-square-{light,dark}.png` | 1080×1080 (1:1) | Feed Instagram (square) |
| `apexrecord-desktop-{light,dark}.png` | 1920×1080 (16:9) | Landscape / slide / desktop |
| `apexrecord-desktop-{light,dark}@2x.png` | 3840×2160 | Versi retina/4K dari landscape |

## Render ulang

```bash
node promo/render.mjs
```

Butuh Playwright (lokal atau global). Konten tile ada di `bento.html` (objek `T`), susunan grid per format di `LAYOUTS`.
Preview di browser: buka `bento.html?f=ig-portrait&theme=dark` (`f` = `ig-portrait` | `ig-square` | `desktop`).

Angka pada tile adalah data contoh untuk keperluan promosi.
