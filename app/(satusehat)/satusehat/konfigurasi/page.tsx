import { redirect } from 'next/navigation';

/** Kredensial SATUSEHAT kini dari env server — menu Konfigurasi diarahkan ke Onboarding. */
export default function SatusehatKonfigurasiRedirect() {
  redirect('/satusehat/onboarding');
}
