export function formatCurrency(value: number | string): string {
  if (value === '' || value === null || value === undefined) return '';
  const num = typeof value === 'string' ? parseInt(value.replace(/\D/g, ''), 10) : value;
  if (isNaN(num)) return '';
  return num.toLocaleString('id-ID');
}

export function parseCurrency(value: string): number {
  const num = parseInt(value.replace(/\D/g, ''), 10);
  return isNaN(num) ? 0 : num;
}

export function formatCurrencyInput(value: string): string {
  const num = value.replace(/\D/g, '');
  if (!num) return '';
  return parseInt(num, 10).toLocaleString('id-ID');
}
