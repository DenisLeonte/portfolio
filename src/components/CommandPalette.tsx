import { useState, useEffect, useRef, useCallback } from 'react';

type Command = {
  id: string;
  label: string;
  hint?: string;
  category: 'navigate' | 'open' | 'action' | 'theme' | 'language';
  icon: React.ReactNode;
  run: () => void;
};

function ti(key: string): string {
  if (typeof window === 'undefined') return key;
  const i18n = (window as any).__i18n;
  return i18n ? i18n.t(key, i18n.getCurrentLang()) : key;
}

function smoothScrollTo(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  else window.location.href = '/#' + id;
}

const NAV_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M12 5l7 7-7 7"/>
  </svg>
);
const LINK_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
);
const COPY_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
);
const DL_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);
const MOON_ICON = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
);
const SUN_ICON = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
  </svg>
);
const GLOBE_ICON = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);

const CATEGORY_LABELS: Record<string, string> = {
  navigate: 'Navigate',
  open: 'Open',
  action: 'Actions',
  theme: 'Theme',
  language: 'Language',
};

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const commands: Command[] = [
    { id: 'nav-about',      label: 'About',           hint: '#about',      category: 'navigate', icon: NAV_ICON, run: () => smoothScrollTo('about') },
    { id: 'nav-skills',     label: 'Skills',          hint: '#skills',     category: 'navigate', icon: NAV_ICON, run: () => smoothScrollTo('skills') },
    { id: 'nav-projects',   label: 'Projects',        hint: '#projects',   category: 'navigate', icon: NAV_ICON, run: () => smoothScrollTo('projects') },
    { id: 'nav-experience', label: 'Experience',      hint: '#experience', category: 'navigate', icon: NAV_ICON, run: () => smoothScrollTo('experience') },
    { id: 'nav-contact',    label: 'Contact',         hint: '/contact',    category: 'navigate', icon: NAV_ICON, run: () => { window.location.href = '/contact'; } },
    { id: 'nav-showcase',   label: 'Showcase',        hint: '/showcase',   category: 'navigate', icon: NAV_ICON, run: () => { window.location.href = '/showcase'; } },
    { id: 'open-github',    label: 'GitHub',          hint: 'github.com',  category: 'open',     icon: LINK_ICON, run: () => { window.open('https://github.com/DenisLeonte', '_blank', 'noopener'); } },
    { id: 'open-linkedin',  label: 'LinkedIn',        hint: 'linkedin.com', category: 'open',    icon: LINK_ICON, run: () => { window.open('https://www.linkedin.com/in/denis-leonte-216683216/', '_blank', 'noopener'); } },
    { id: 'copy-email',     label: 'Copy Email',      hint: 'denis@denistechs.com', category: 'action', icon: COPY_ICON, run: () => { navigator.clipboard?.writeText('denis@denistechs.com'); } },
    { id: 'dl-resume',      label: 'Download Resume', hint: 'resume.pdf',  category: 'action',   icon: DL_ICON,  run: () => { const a = document.createElement('a'); a.href='/resume.pdf'; a.download='resume.pdf'; a.click(); } },
    { id: 'theme-dark',     label: 'Dark Mode',       category: 'theme',   icon: MOON_ICON, run: () => { document.querySelector<HTMLButtonElement>('.theme-btn[data-theme="dark"]')?.click(); } },
    { id: 'theme-light',    label: 'Light Mode',      category: 'theme',   icon: SUN_ICON,  run: () => { document.querySelector<HTMLButtonElement>('.theme-btn[data-theme="light"]')?.click(); } },
    { id: 'lang-en',        label: 'English',         hint: 'EN',          category: 'language', icon: GLOBE_ICON, run: () => { (window as any).__i18n?.setLang('en'); } },
    { id: 'lang-ro',        label: 'Română',          hint: 'RO',          category: 'language', icon: GLOBE_ICON, run: () => { (window as any).__i18n?.setLang('ro'); } },
    { id: 'lang-it',        label: 'Italiano',        hint: 'IT',          category: 'language', icon: GLOBE_ICON, run: () => { (window as any).__i18n?.setLang('it'); } },
  ];

  const filtered = query.trim()
    ? commands.filter((c) =>
        c.label.toLowerCase().includes(query.toLowerCase()) ||
        c.hint?.toLowerCase().includes(query.toLowerCase()) ||
        c.category.toLowerCase().includes(query.toLowerCase())
      )
    : commands;

  // Group by category preserving order
  const groups = filtered.reduce<{ cat: string; items: (Command & { idx: number })[] }[]>((acc, cmd) => {
    const flatIdx = filtered.indexOf(cmd);
    const last = acc[acc.length - 1];
    if (last && last.cat === cmd.category) {
      last.items.push({ ...cmd, idx: flatIdx });
    } else {
      acc.push({ cat: cmd.category, items: [{ ...cmd, idx: flatIdx }] });
    }
    return acc;
  }, []);

  const close = useCallback(() => { setOpen(false); setQuery(''); setActiveIdx(0); }, []);

  const runAndClose = useCallback((cmd: Command) => {
    close();
    setTimeout(() => cmd.run(), 60);
  }, [close]);

  // Global Cmd/Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setActiveIdx(0);
    }
  }, [open]);

  // Keyboard nav inside palette
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { close(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      const cmd = filtered[activeIdx];
      if (cmd) runAndClose(cmd);
    }
  };

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${activeIdx}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  if (!open) return null;

  return (
    <div
      className="cmd-overlay"
      role="dialog"
      aria-label="Command palette"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div className="cmd-palette" onKeyDown={onKeyDown}>
        {/* Search input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem', borderBottom: '1px solid var(--border-green)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: 'var(--green-muted)', flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIdx(0); }}
            placeholder="Type a command or search..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.875rem',
            }}
            aria-label="Search commands"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', border: '1px solid var(--border-green)', borderRadius: '4px', padding: '0.1rem 0.4rem', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
            esc
          </kbd>
        </div>

        {/* Results */}
        <ul
          ref={listRef}
          role="listbox"
          style={{ maxHeight: '320px', overflowY: 'auto', padding: '0.35rem 0', margin: 0, listStyle: 'none' }}
        >
          {filtered.length === 0 && (
            <li style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.825rem' }}>
              No results for &ldquo;{query}&rdquo;
            </li>
          )}
          {groups.map(({ cat, items }) => (
            <li key={cat} role="presentation">
              <div style={{ padding: '0.4rem 1rem 0.2rem', fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--green-muted)', fontFamily: 'var(--font-mono)' }}>
                {CATEGORY_LABELS[cat] ?? cat}
              </div>
              <ul role="group" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {items.map(({ idx, ...cmd }) => (
                  <li
                    key={cmd.id}
                    role="option"
                    aria-selected={activeIdx === idx}
                    data-idx={idx}
                    onClick={() => runAndClose(cmd)}
                    onMouseEnter={() => setActiveIdx(idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.55rem 1rem',
                      cursor: 'pointer',
                      background: activeIdx === idx ? 'var(--green-glow)' : 'transparent',
                      borderLeft: activeIdx === idx ? '2px solid var(--green-primary)' : '2px solid transparent',
                      transition: 'background 0.1s ease',
                    }}
                  >
                    <span style={{ color: activeIdx === idx ? 'var(--green-primary)' : 'var(--text-secondary)', flexShrink: 0, display: 'flex' }}>
                      {cmd.icon}
                    </span>
                    <span style={{ flex: 1, fontSize: '0.85rem', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                      {cmd.label}
                    </span>
                    {cmd.hint && (
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', opacity: 0.7 }}>
                        {cmd.hint}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>

        {/* Footer hint */}
        <div style={{ display: 'flex', gap: '1rem', padding: '0.5rem 1rem', borderTop: '1px solid var(--border-green)', fontSize: '0.65rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
          <span><kbd style={{ border: '1px solid var(--border-green)', borderRadius: '3px', padding: '0 0.3rem' }}>↑↓</kbd> navigate</span>
          <span><kbd style={{ border: '1px solid var(--border-green)', borderRadius: '3px', padding: '0 0.3rem' }}>↵</kbd> select</span>
          <span><kbd style={{ border: '1px solid var(--border-green)', borderRadius: '3px', padding: '0 0.3rem' }}>esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
