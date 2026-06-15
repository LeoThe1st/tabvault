import browserPolyfill from 'webextension-polyfill';

/** Кросс-браузерный API. В Chromium polyfill оборачивает chrome.* в promises;
 *  в Firefox/Safari нативный browser.* уже промисный. */
export const browser = browserPolyfill;

/** Запущены ли мы в контексте extension'а (а не на голой web-странице). */
export const isExtension =
  typeof browserPolyfill !== 'undefined' &&
  !!browserPolyfill.runtime &&
  !!browserPolyfill.runtime.id;
