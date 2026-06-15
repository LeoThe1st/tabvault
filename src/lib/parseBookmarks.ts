import { parseUrls } from './parseUrls';

export interface ParsedBookmark {
  url: string;
  title?: string;
}

/** Парсит HTML-экспорт закладок (Netscape Bookmark File Format):
 *  <DT><A HREF="...">Title</A>. Возвращает уникальные пары url+title. */
function parseBookmarkHtml(text: string): ParsedBookmark[] {
  const doc = new DOMParser().parseFromString(text, 'text/html');
  const seen = new Map<string, ParsedBookmark>();
  for (const a of Array.from(doc.querySelectorAll('a[href]'))) {
    const href = (a.getAttribute('href') || '').trim();
    if (!/^https?:\/\//i.test(href)) continue;
    const title = (a.textContent || '').trim();
    if (!seen.has(href)) {
      seen.set(href, { url: href, title: title || undefined });
    }
  }
  return [...seen.values()];
}

/** Универсальный парсер: HTML-формат если есть <a> теги, иначе regex по тексту. */
export function parseBookmarks(text: string): ParsedBookmark[] {
  if (!text) return [];
  // Если в тексте есть похожее на anchor — пробуем HTML-парсер
  if (/<a\b[^>]*\bhref\s*=/i.test(text)) {
    const html = parseBookmarkHtml(text);
    if (html.length > 0) return html;
  }
  // Fallback: чистый regex по URL'ам
  return parseUrls(text).map((url) => ({ url }));
}
