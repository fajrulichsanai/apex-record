import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import { FeaturesProvider } from "@/lib/features-context";
import { ToastProvider } from "@/lib/toast-context";
import { SubscriptionGateProvider } from "@/lib/subscription-gate-context";
import { ThemeProvider, THEME_INIT_SCRIPT } from "@/lib/theme-context";
import ImpersonationBanner from "@/components/subscription/ImpersonationBanner";
import DemoBanner from "@/components/demo/DemoBanner";
import VisitorTracking from "@/components/layout/VisitorTracking";
import VersionWatcher from "@/components/layout/VersionWatcher";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  // Alamat absolut untuk ikon & gambar pratinjau: selalu domain utama
  metadataBase: new URL("https://apexrecord.my.id"),
  title: "ApexRecord",
  description: "Sistem manajemen klinik ApexRecord",
  icons: {
    icon: "/logo-apex-record.png",
    shortcut: "/logo-apex-record.png",
    apple: "/logo-apex-record.png",
  },
};

// Menandai <html> setelah font ikon siap. Sebelum itu ikon disembunyikan (lihat
// globals.css) supaya nama ikon tidak muncul sebagai teks mentah di koneksi lambat.
// Bila font gagal dimuat, ikon tetap tersembunyi (label teks di tombol tetap ada).
const ICON_FONT_READY_SCRIPT = `(function(){var d=document.documentElement;function ok(){d.classList.add('icons-ready')}try{if(document.fonts&&document.fonts.load){document.fonts.load('24px "Material Symbols Rounded"','add').then(function(f){if(f&&f.length)ok()},function(){})}else{ok()}}catch(e){ok()}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${poppins.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Font ikon dihost sendiri (544 KB, hanya sumbu FILL yang dipakai) dan
            diunduh bersamaan dengan HTML; dulu 5,4 MB dari Google Fonts. */}
        <link
          rel="preload"
          href="/fonts/material-symbols-rounded.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: ICON_FONT_READY_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <VisitorTracking />
        <VersionWatcher />
        <ThemeProvider>
          <AuthProvider>
            <FeaturesProvider>
            <ToastProvider>
              <SubscriptionGateProvider>
                <DemoBanner />
                <ImpersonationBanner />
                {children}
              </SubscriptionGateProvider>
            </ToastProvider>
            </FeaturesProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
