import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '@/store/store';
import { useDialogs } from '@/dialogs/DialogHost';
import { Toggle } from './Toggle';
import { CloseIcon, GearIcon, TrashIcon } from './icons';

const REPO = 'LeoThe1st/tabvault';
const VERSION = '2.0.0';

interface Props {
  onClose: () => void;
}

type Tab = 'general' | 'support';

export function SettingsModal({ onClose }: Props) {
  const [tab, setTab] = useState<Tab>('general');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const r = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(r);
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className={'modal' + (open ? ' open' : '')} onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <aside className="settings-sidebar">
          <h2>Settings</h2>
          <nav className="settings-nav">
            <button
              className={'settings-nav-btn' + (tab === 'general' ? ' active' : '')}
              onClick={() => setTab('general')}
            >
              <GearIcon /> General
            </button>
            <button
              className={'settings-nav-btn' + (tab === 'support' ? ' active' : '')}
              onClick={() => setTab('support')}
            >
              <BugIcon /> Support
            </button>
          </nav>
        </aside>

        <div className="settings-content">
          <button className="settings-close" title="Close" onClick={onClose}>
            <CloseIcon />
          </button>
          {tab === 'general' ? <GeneralTab /> : <SupportTab />}
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ===== General ===== */

function GeneralTab() {
  const dialogs = useDialogs();
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const animations = useStore((s) => s.animations);
  const setAnimations = useStore((s) => s.setAnimations);
  const compact = useStore((s) => s.compact);
  const setCompact = useStore((s) => s.setCompact);
  const showFavicons = useStore((s) => s.showFavicons);
  const setShowFavicons = useStore((s) => s.setShowFavicons);
  const showDescriptions = useStore((s) => s.showDescriptions);
  const setShowDescriptions = useStore((s) => s.setShowDescriptions);
  const reset = useStore((s) => s.reset);

  const onReset = async () => {
    const ok = await dialogs.confirm({
      title: 'Reset',
      message: 'Сбросить всё? Все доски и закладки будут удалены без возможности восстановления.',
      confirmLabel: 'Reset',
      danger: true
    });
    if (ok) reset();
  };

  return (
    <>
      <h1 className="settings-h1">General</h1>

      <Section title="Внешний вид">
        <SettingRow
          title="Тема"
          desc="Светлое или тёмное оформление интерфейса"
          control={
            <div className="seg">
              <button
                className={'seg-btn' + (theme === 'dark' ? ' active' : '')}
                onClick={() => setTheme('dark')}
              >
                Тёмная
              </button>
              <button
                className={'seg-btn' + (theme === 'light' ? ' active' : '')}
                onClick={() => setTheme('light')}
              >
                Светлая
              </button>
            </div>
          }
        />
        <SettingRow
          title="Анимации"
          desc="Плавные переходы при появлении меню, досок, диалогов"
          control={<Toggle checked={animations} onChange={setAnimations} label="Анимации" />}
        />
        <SettingRow
          title="Компактный режим"
          desc="Уменьшает отступы внутри досок и карточек закладок"
          control={<Toggle checked={compact} onChange={setCompact} label="Компактный режим" />}
        />
        <SettingRow
          title="Показывать favicons"
          desc="Иконки сайтов рядом с названиями закладок"
          control={<Toggle checked={showFavicons} onChange={setShowFavicons} label="Favicons" />}
        />
        <SettingRow
          title="Показывать описания"
          desc="Текст описания под названием закладки (если задан)"
          control={
            <Toggle
              checked={showDescriptions}
              onChange={setShowDescriptions}
              label="Описания"
            />
          }
        />
      </Section>

      <Section title="Опасная зона">
        <SettingRow
          title="Сбросить всё"
          desc="Удалит все workspaces, доски, закладки, настройки. Откат невозможен."
          control={
            <button className="btn-danger-solid" onClick={() => void onReset()}>
              <TrashIcon /> Reset
            </button>
          }
        />
      </Section>
    </>
  );
}

/* ===== Support ===== */

function SupportTab() {
  const bugUrl = (() => {
    const title = encodeURIComponent('Bug: ');
    const body = encodeURIComponent(
      [
        '**What you expected to happen:**',
        '',
        '**What actually happened:**',
        '',
        '**Steps to reproduce:**',
        '1.',
        '2.',
        '3.',
        '',
        '**Environment:**',
        `- TabVault version: ${VERSION}`,
        `- Browser: ${navigator.userAgent}`,
        ''
      ].join('\n')
    );
    return `https://github.com/${REPO}/issues/new?title=${title}&body=${body}`;
  })();

  const issuesUrl = `https://github.com/${REPO}/issues`;

  return (
    <>
      <h1 className="settings-h1">Support</h1>

      <div className="support-card">
        <div className="support-card-title">Contact</div>
        <p className="support-card-desc">
          Вопросы и обратная связь — через GitHub Issues:{' '}
          <a href={issuesUrl} target="_blank" rel="noreferrer">
            {REPO}/issues
          </a>
        </p>
        <a className="support-btn" href={issuesUrl} target="_blank" rel="noreferrer">
          Перейти на GitHub
        </a>
        <div className="support-version">Version {VERSION}</div>
      </div>

      <div className="support-card">
        <div className="support-card-head">
          <div className="support-card-icon">
            <BugIcon />
          </div>
          <div>
            <div className="support-card-title">Нашли баг?</div>
            <p className="support-card-desc">
              Помогите быстрее починить — опишите проблему подробно.
            </p>
          </div>
        </div>

        <div className="support-list-title">Что включить:</div>
        <ul className="support-list">
          <li>Что должно было произойти.</li>
          <li>Что произошло на самом деле.</li>
          <li>Шаги для воспроизведения.</li>
          <li>Браузер и версия ОС.</li>
        </ul>

        <a className="support-btn" href={bugUrl} target="_blank" rel="noreferrer">
          Open Bug Report Form
        </a>
        <div className="support-version">Откроет шаблон issue с уже заполненными полями.</div>
      </div>
    </>
  );
}

/* ===== shared ===== */

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="settings-section">
      <h3 className="settings-section-title">{title}</h3>
      <div className="settings-section-body">{children}</div>
    </section>
  );
}

function SettingRow({
  title,
  desc,
  control
}: {
  title: string;
  desc: string;
  control: ReactNode;
}) {
  return (
    <div className="setting-row">
      <div className="setting-row-text">
        <div className="setting-row-title">{title}</div>
        <div className="setting-row-desc">{desc}</div>
      </div>
      <div className="setting-row-control">{control}</div>
    </div>
  );
}

function BugIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={18}
      height={18}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="8" y="6" width="8" height="14" rx="4" />
      <path d="M19 7l-3 2" />
      <path d="M5 7l3 2" />
      <path d="M19 13h-3" />
      <path d="M8 13H5" />
      <path d="M19 19l-3-2" />
      <path d="M5 19l3-2" />
      <path d="M9 6c0-1.7 1.3-3 3-3s3 1.3 3 3" />
    </svg>
  );
}
