export function bytes(n: number): string {
  if (n < 1024) return n + ' B';
  if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
  if (n < 1073741824) return (n / 1048576).toFixed(1) + ' MB';
  return (n / 1073741824).toFixed(2) + ' GB';
}
export function pct(n: number, digits = 1): string { return (n * 100).toFixed(digits) + '%'; }
export function fmt(n: number, digits = 3): string {
  if (!isFinite(n)) return '—';
  return n.toFixed(digits);
}
export function classNames(...xs: (string | false | null | undefined)[]): string {
  return xs.filter(Boolean).join(' ');
}
