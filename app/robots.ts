import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

/**
 * Satu berkas untuk semua host: apexrecord.my.id/robots.txt dialihkan nginx ke
 * app.apexrecord.my.id/robots.txt, jadi aturannya TIDAK boleh memblokir apa pun
 * yang perlu diindeks. Halaman aplikasi dan staging dijaga lewat header
 * X-Robots-Tag: noindex (lihat next.config.ts), bukan lewat robots.txt: noindex
 * hanya terbaca bila halamannya boleh di-crawl.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/'] }],
    sitemap: 'https://apexrecord.my.id/sitemap.xml',
  };
}
