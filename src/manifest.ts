import { defineManifest } from '@crxjs/vite-plugin';
import pkg from '../package.json';

export default defineManifest({
  manifest_version: 3,
  name: 'TabVault',
  version: pkg.version,
  description: pkg.description,
  permissions: ['storage', 'bookmarks', 'tabs', 'unlimitedStorage'],
  host_permissions: ['<all_urls>'],
  chrome_url_overrides: {
    newtab: 'src/newtab/index.html'
  },
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module'
  },
  commands: {
    'save-current-tab': {
      suggested_key: { default: 'Ctrl+B', mac: 'Command+B' },
      description: 'Сохранить текущую вкладку в TabVault'
    }
  },
  action: {
    default_title: 'Открыть TabVault'
  }
});
