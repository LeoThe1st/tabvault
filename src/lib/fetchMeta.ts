export interface PageMeta {
  title: string;
  desc: string;
}

export async function fetchTitleAndDesc(url: string): Promise<PageMeta> {
  let host = url;
  try {
    host = new URL(url).hostname;
  } catch {
    // оставляем url как есть
  }
  try {
    const r = await fetch(url, { redirect: 'follow', credentials: 'omit' });
    if (!r.ok) throw new Error('bad response');
    const html = await r.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const t = (doc.querySelector('title')?.textContent || '').trim();
    const d = (
      doc.querySelector('meta[name="description"]')?.getAttribute('content') ||
      doc.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
      ''
    ).trim();
    return { title: t || host, desc: d };
  } catch {
    return { title: host, desc: '' };
  }
}
