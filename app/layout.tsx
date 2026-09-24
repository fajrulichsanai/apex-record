import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import { ToastProvider } from "@/lib/toast-context";
import { SubscriptionGateProvider } from "@/lib/subscription-gate-context";
import { MfaGateProvider } from "@/lib/mfa-gate-context";
import { ThemeProvider, THEME_INIT_SCRIPT } from "@/lib/theme-context";
import ImpersonationBanner from "@/components/subscription/ImpersonationBanner";
import DemoBanner from "@/components/demo/DemoBanner";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "ApexRecord",
  description: "Sistem manajemen klinik ApexRecord",
  icons: {
    icon: "/logo-apex-record.png",
    shortcut: "/logo-apex-record.png",
    apple: "/logo-apex-record.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <MfaGateProvider>
                <SubscriptionGateProvider>
                  <DemoBanner />
                  <ImpersonationBanner />
                  {children}
                </SubscriptionGateProvider>
              </MfaGateProvider>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
