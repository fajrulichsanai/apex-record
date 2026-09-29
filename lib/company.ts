/**
 * The legal entity behind ApexRecord. Shown in the landing footer and the
 * legal pages; change it here and every page follows.
 */
export const COMPANY = {
  legalName: 'PT Zanak Developer Abadi',
  brand: 'ApexRecord',
  address: 'Jl. Jenderal Sudirman No. 7, Payakumbuh, Sumatera Barat',
  email: 'zanakdeveloper@gmail.com',
  phone: '0823-8769-6487',
  whatsappUrl: 'https://wa.me/6282387696487',
} as const;

/** Effective date of the current privacy policy, terms and refund policy. */
export const LEGAL_EFFECTIVE_DATE = '29 September 2026';

export const LEGAL_LINKS = [
  { href: '/kebijakan-privasi', label: 'Kebijakan Privasi' },
  { href: '/syarat-ketentuan', label: 'Syarat & Ketentuan' },
  { href: '/kebijakan-refund', label: 'Kebijakan Pengembalian Dana' },
] as const;
