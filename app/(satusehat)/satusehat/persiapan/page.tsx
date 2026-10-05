import { redirect } from 'next/navigation';

/** Menu lama "Persiapan" → Onboarding SATUSEHAT. */
export default function SatusehatPersiapanRedirect() {
  redirect('/satusehat/onboarding');
}
