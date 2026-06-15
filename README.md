<div align="center">

# 🗂️ TabVault

**Visual bookmark manager that takes over your new tab page.**
**Визуальный менеджер закладок на новой вкладке Chrome.**

[![Latest Release](https://img.shields.io/github/v/release/LeoThe1st/tabvault?style=flat-square&color=6d28d9)](https://github.com/LeoThe1st/tabvault/releases/latest)
[![License](https://img.shields.io/badge/license-GPL--3.0-blue?style=flat-square)](LICENSE)
[![Built with](https://img.shields.io/badge/built%20with-React%20%2B%20TS%20%2B%20Vite-61dafb?style=flat-square)](#tech-stack)
[![Manifest V3](https://img.shields.io/badge/MV3-Chrome%20%E2%80%A2%20Firefox%20128%2B-brightgreen?style=flat-square)](https://developer.chrome.com/docs/extensions/mv3/intro/)

[English](#-tabvault-en) · [Русский](#-tabvault-ru)

</div>

---

## 🇬🇧 TabVault (EN)

Organize your bookmarks as **drag-and-drop boards** on a clean new-tab page. Multiple workspaces, inline link previews, soft-delete trash, bulk selection, incognito-open mode, and more — all running 100% locally, no servers, no tracking.

### ✨ Features

| | |
|---|---|
| 🗂️ **Workspaces** | Multiple independent pages, each with its own board grid |
| 🎯 **Drag-and-drop boards** | 4-column flexible grid; rearrange boards across columns |
| 🔗 **Smart bookmarks** | Title, URL, description, favicon — added inline with auto-fetched metadata |
| ⌨️ **Quick save** | `Ctrl+B` / `Cmd+B` saves current tab to the Inbox board |
| 📥 **Imports** | From Chrome bookmarks OR from any text/file containing URLs |
| 🗑️ **Soft-delete trash** | 30-day recovery window; restore or purge anytime |
| ☑️ **Bulk selection** | Multi-select bookmarks to move or delete in one go |
| 🕶️ **Incognito mode** | Toggle to open every clicked link in an incognito window |
| 🌓 **Themes & privacy** | Dark/light theme, on-the-fly blur to hide bookmarks |
| 🖼️ **Custom wallpapers** | Upload an image or paste a URL |
| ⚙️ **Visual settings** | Toggles for animations, compact mode, favicons, descriptions |

### 📥 Install (users)

Each release ships two zips on the [releases page](https://github.com/LeoThe1st/tabvault/releases/latest).

#### Chrome / Edge / Brave / Opera / Vivaldi
1. Download `tabvault-chrome-vX.X.X.zip`
2. Extract the archive
3. Open `chrome://extensions`
4. Enable **Developer mode** (top-right toggle)
5. Click **Load unpacked** and select the extracted folder

#### Firefox (128+)
1. Download `tabvault-firefox-vX.X.X.zip`
2. Extract the archive
3. Open `about:debugging#/runtime/this-firefox`
4. Click **Load Temporary Add-on…** and select `manifest.json` inside the extracted folder

> Firefox 128+ supports MV3. If MV3 extensions are not loading, ensure `extensions.manifestV3.enabled` is `true` in `about:config`.

### 🛠️ Build from source (developers)

Requires Node.js 20+.

```bash
git clone https://github.com/LeoThe1st/tabvault.git
cd tabvault
npm install
npm run dev              # Vite dev-server with HMR (writes to dist/)
npm run build            # Chrome bundle in dist/
npm run build:firefox    # Firefox bundle in dist-firefox/
npm run typecheck
```

Then load `dist/` (Chrome) or `dist-firefox/` (Firefox) as an unpacked extension.

### 🧰 Tech stack

- **[Vite](https://vitejs.dev/)** + **[@crxjs/vite-plugin](https://github.com/crxjs/chrome-extension-tools)** — MV3 build with HMR
- **[React 18](https://react.dev/)** + **[TypeScript](https://www.typescriptlang.org/)**
- **[Zustand](https://github.com/pmndrs/zustand)** + persist middleware over `chrome.storage.local`
- **[@dnd-kit](https://dndkit.com/)** — drag-and-drop

### 📂 Project structure

```
src/
  manifest.ts            # MV3 manifest (generated into dist/)
  newtab/                # new-tab entry point
  background/index.ts    # service worker (Ctrl+B → Inbox)
  store/                 # Zustand + migration + chrome.storage adapter
  components/            # Topbar, Canvas, Board, Bookmark, FABs, dialogs, …
  contexts/              # SelectionContext (multi-select state)
  dialogs/DialogHost.tsx # promise-based dialogs
  lib/                   # uid, favicon, fetchMeta, parseUrls, openUrl
  styles/global.css      # all styles
```

### 🤝 Contributing

Pull requests welcome. For bug reports use the **Open Bug Report Form** button inside the extension's Settings → Support, or [open an issue](https://github.com/LeoThe1st/tabvault/issues) directly.

### 📄 License

[GNU GPL v3](LICENSE) — free to use, modify, and redistribute under the same license.

<div align="right"><a href="#-tabvault">↑ back to top</a></div>

---

## 🇷🇺 TabVault (RU)

Организуй закладки как **drag-and-drop доски** на чистой странице новой вкладки. Несколько workspace'ов, inline-добавление с авто-fetch метаданных, отложенное удаление (корзина с 30-дневной отсрочкой), массовое выделение, режим открытия в incognito — всё работает локально, без серверов и трекинга.

### ✨ Возможности

| | |
|---|---|
| 🗂️ **Workspaces** | Несколько независимых страниц, у каждой своя сетка досок |
| 🎯 **DnD досок** | Гибкая 4-колоночная раскладка; перенос между колонками |
| 🔗 **Закладки с метаданными** | Title, URL, description, favicon — добавляются inline с авто-fetch |
| ⌨️ **Быстрое сохранение** | `Ctrl+B` / `Cmd+B` сохраняет текущую вкладку в Inbox |
| 📥 **Импорты** | Из закладок Chrome ИЛИ из любого текста/файла со ссылками |
| 🗑️ **Soft-delete корзина** | Окно восстановления 30 дней; восстанавливай или чисти когда хочешь |
| ☑️ **Массовое выделение** | Выбери несколько закладок, перенеси или удали оптом |
| 🕶️ **Incognito-режим** | Тумблер: все клики по закладкам открываются в инкогнито-окне |
| 🌓 **Темы и приватность** | Тёмная/светлая тема, блюр содержимого на лету |
| 🖼️ **Свои обои** | Картинка из URL или с диска |
| ⚙️ **Визуальные настройки** | Тумблеры для анимаций, компактного режима, favicons, описаний |

### 📥 Установка (для пользователей)

В каждом [релизе](https://github.com/LeoThe1st/tabvault/releases/latest) лежат два zip'а.

#### Chrome / Edge / Brave / Opera / Vivaldi
1. Скачай `tabvault-chrome-vX.X.X.zip`
2. Распакуй
3. Открой `chrome://extensions`
4. Включи **Developer mode**
5. Жми **Load unpacked** и выбери распакованную папку

#### Firefox (128+)
1. Скачай `tabvault-firefox-vX.X.X.zip`
2. Распакуй
3. Открой `about:debugging#/runtime/this-firefox`
4. Жми **Load Temporary Add-on…** и выбери `manifest.json` внутри распакованной папки

> Firefox 128+ поддерживает MV3. Если расширение не грузится — проверь `extensions.manifestV3.enabled = true` в `about:config`.

### 🛠️ Сборка из исходников (для разработчиков)

Нужен Node.js 20+.

```bash
git clone https://github.com/LeoThe1st/tabvault.git
cd tabvault
npm install
npm run dev              # Vite dev-сервер с HMR (пишет в dist/)
npm run build            # Chrome-бандл в dist/
npm run build:firefox    # Firefox-бандл в dist-firefox/
npm run typecheck
```

После этого подгружай папку `dist/` как unpacked-расширение.

### 🧰 Стек

- **[Vite](https://vitejs.dev/)** + **[@crxjs/vite-plugin](https://github.com/crxjs/chrome-extension-tools)** — MV3-сборка с HMR
- **[React 18](https://react.dev/)** + **[TypeScript](https://www.typescriptlang.org/)**
- **[Zustand](https://github.com/pmndrs/zustand)** + persist-мидлвар поверх `chrome.storage.local`
- **[@dnd-kit](https://dndkit.com/)** — drag-and-drop

### 📂 Структура проекта

```
src/
  manifest.ts            # MV3-манифест (генерируется в dist/)
  newtab/                # точка входа новой вкладки
  background/index.ts    # service worker (Ctrl+B → Inbox)
  store/                 # Zustand + миграция + адаптер chrome.storage
  components/            # Topbar, Canvas, Board, Bookmark, FABs, диалоги, …
  contexts/              # SelectionContext (стейт мульти-выделения)
  dialogs/DialogHost.tsx # promise-API диалогов
  lib/                   # uid, favicon, fetchMeta, parseUrls, openUrl
  styles/global.css      # все стили
```

### 🤝 Вклад

Pull request'ы welcome. Для багрепортов используй кнопку **Open Bug Report Form** в Settings → Support внутри расширения, либо [открой issue](https://github.com/LeoThe1st/tabvault/issues) напрямую.

### 📄 Лицензия

[GNU GPL v3](LICENSE) — можешь использовать, изменять и распространять под той же лицензией.

<div align="right"><a href="#-tabvault">↑ наверх</a></div>
