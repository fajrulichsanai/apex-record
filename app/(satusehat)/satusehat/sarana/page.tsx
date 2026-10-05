import { redirect } from 'next/navigation';

/** Master data SATUSEHAT kini hanya di panel Super Admin. */
export default function SatusehatMasterDataRedirect() {
  redirect('/satusehat');
}
