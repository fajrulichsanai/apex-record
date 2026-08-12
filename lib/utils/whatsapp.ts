export function waLink(phone: string, text?: string) {
  const digits = phone.replace(/\D/g, '');
  const normalized = digits.startsWith('0') ? `62${digits.slice(1)}` : digits;
  return text ? `https://wa.me/${normalized}?text=${encodeURIComponent(text)}` : `https://wa.me/${normalized}`;
}
