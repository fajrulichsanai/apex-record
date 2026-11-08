import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

/**
 * Hanya halaman pemasaran di domain utama. Halaman aplikasi (login, dashboard,
 * dll.) sengaja tidak masuk: tidak ada isi publik dan bertanda noindex.
 * Tambahkan halaman landing baru di sini (mis. /sim-klinik) setelah nginx
 * menyajikannya langsung di apexrecord.my.id.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://apexrecord.my.id/',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ];
}
