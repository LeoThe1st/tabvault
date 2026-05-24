/** Открывает URL. В режиме incognito пытается создать инкогнито-окно через chrome.windows.create.
 *  Возвращает { ok, reason? } — reason если не получилось открыть в incognito.
 */
export async function openUrl(
  url: string,
  opts: { incognito?: boolean; activeTab?: boolean } = {}
): Promise<{ ok: boolean; reason?: 'no-permission' | 'no-chrome' | 'failed' }> {
  const inExt = typeof chrome !== 'undefined' && !!chrome.windows && !!chrome.tabs;

  if (opts.incognito) {
    if (!inExt) return { ok: false, reason: 'no-chrome' };
    try {
      await chrome.windows.create({ url, incognito: true });
      return { ok: true };
    } catch (e: any) {
      const msg = String(e?.message || e || '');
      if (/incognito/i.test(msg)) return { ok: false, reason: 'no-permission' };
      return { ok: false, reason: 'failed' };
    }
  }

  // обычное открытие — в той же вкладке
  if (inExt && chrome.tabs?.update) {
    try {
      await chrome.tabs.update({ url });
      return { ok: true };
    } catch {
      // fallthrough на window.open
    }
  }
  window.open(url, '_self');
  return { ok: true };
}
