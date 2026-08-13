import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import { ToastProvider } from "@/lib/toast-context";
import { SubscriptionGateProvider } from "@/lib/subscription-gate-context";
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
    >
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <ToastProvider>
            <SubscriptionGateProvider>{children}</SubscriptionGateProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
