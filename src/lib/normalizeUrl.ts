export function normalizeUrl(raw: string): string {
  const v = raw.trim();
  if (!v) return '';
  return /^https?:\/\//i.test(v) ? v : 'https://' + v;
}
