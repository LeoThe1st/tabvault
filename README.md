# TabVault

Визуальный менеджер закладок на новой вкладке Chrome (MV3). React + TypeScript + Vite + @dnd-kit + Zustand.

## Возможности
- Несколько страниц (workspaces) с независимыми сетками досок
- Доски в grid (до 4 колонок), drag-and-drop досок между ячейками/колонками
- Закладки внутри досок (title, url, description, favicon), DnD между досками
- Inline-форма добавления ссылки с авто-fetch title и meta description
- Сохранение текущей вкладки по `Ctrl+B` / `Cmd+B` в доску `Inbox`
- Кастомные диалоги (prompt/confirm/alert/edit)
- Импорт закладок Chrome, поиск по всем закладкам
- Темы (тёмная/светлая), приватный режим (blur), обои из URL или файла

## Разработка

```bash
npm install
npm run dev       # Vite dev-server с HMR
npm run build     # типы + продакшен-бандл в dist/
npm run typecheck
```

## Установка расширения в Chrome
1. `npm run build`
2. Открой `chrome://extensions`
3. Включи **Developer mode** (правый верхний угол)
4. Жми **Load unpacked** и выбери папку `dist/`
5. Открой новую вкладку - увидишь TabVault

В dev-режиме (`npm run dev`) `@crxjs/vite-plugin` тоже собирает расширение в `dist/` с HMR - можно сразу load unpacked этот же `dist/` и менять код на лету.

## Структура

```
src/
  manifest.ts            # MV3 манифест (генерируется в dist/)
  newtab/                # точка входа новой вкладки
    index.html
    main.tsx
  background/index.ts    # service worker (Ctrl+B → Inbox)
  store/                 # Zustand + миграция формата + chrome.storage адаптер
  components/            # Topbar, Canvas, Board, Bookmark, Cell, FABs, …
  dialogs/DialogHost.tsx # promise-API диалоги
  lib/                   # uid, favicon, fetchMeta, normalizeUrl
  styles/global.css      # все стили
```

Формат `state` в `chrome.storage.local` сохранён 1-в-1 с прежней ванильной версией - старые данные подхватятся автоматически.
