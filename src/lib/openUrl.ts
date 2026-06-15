import { browser, isExtension } from './browser';

/** Открывает URL. В режиме incognito пытается создать инкогнито/private окно.
 *  Возвращает { ok, reason? } если не получилось. */
export async function openUrl(
  url: string,
  opts: { incognito?: boolean } = {}
): Promise<{ ok: boolean; reason?: 'no-permission' | 'no-extension' | 'failed' }> {
  if (opts.incognito) {
    if (!isExtension) return { ok: false, reason: 'no-extension' };
    try {
      await browser.windows.create({ url, incognito: true });
      return { ok: true };
    } catch (e: unknown) {
      const msg = String((e as { message?: string })?.message || e || '');
      // Chrome: "Incognito mode is disabled" / Firefox: "Extension does not have permission for private browsing"
      if (/incognito|private|permission/i.test(msg)) return { ok: false, reason: 'no-permission' };
      return { ok: false, reason: 'failed' };
    }
  }

  if (isExtension && browser.tabs?.update) {
    try {
      await browser.tabs.update({ url });
      return { ok: true };
    } catch {
      // fallthrough
    }
  }
  window.open(url, '_self');
  return { ok: true };
}
