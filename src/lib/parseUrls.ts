const URL_RE = /https?:\/\/[^\s<>"'`]+/gi;

/** Достаёт все http(s) URL'ы из произвольного текста.
 *  Чистит хвостовые знаки препинания, которые часто прилипают (), . , ; ! ? ] ) > " ' ` */
export function parseUrls(text: string): string[] {
  if (!text) return [];
  const out = new Set<string>();
  const matches = text.match(URL_RE) || [];
  for (let raw of matches) {
    raw = raw.replace(/[)\].,;:!?>"'`]+$/g, '');
    if (raw.length < 8) continue;
    try {
      new URL(raw);
      out.add(raw);
    } catch {
      // bad URL — skip
    }
  }
  return [...out];
}
