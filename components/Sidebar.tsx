'use client';

import Image from 'next/image';

export type NavItem = 'Todos' | 'Shows' | 'App' | 'Canal WA' | 'Campañas Temporada';

const NAV_ITEMS: { key: NavItem; icon: string }[] = [
  { key: 'Todos', icon: '◆' },
  { key: 'Shows', icon: '🎪' },
  { key: 'App', icon: '📱' },
  { key: 'Canal WA', icon: '💬' },
  { key: 'Campañas Temporada', icon: '🎉' },
];

interface SidebarProps {
  active: NavItem;
  onSelect: (item: NavItem) => void;
}

export default function Sidebar({ active, onSelect }: SidebarProps) {
  return (
    <aside className="w-full md:w-60 shrink-0 bg-plimBlue md:min-h-screen md:sticky md:top-0 flex flex-col">
      <div className="flex items-center gap-3 px-5 py-6 border-b border-white/15">
        <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-plimYellow shrink-0">
          <Image
            src="/plimplim-logo.jpg"
            alt="Plim Plim"
            width={44}
            height={44}
            className="object-cover w-full h-full"
          />
        </div>
        <div>
          <p className="font-display text-white text-lg leading-tight">Plim Plim</p>
          <p className="text-white/70 text-xs">Paid Media</p>
        </div>
      </div>

      <nav className="flex md:flex-col overflow-x-auto md:overflow-visible px-3 py-3 gap-1">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            onClick={() => onSelect(item.key)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition text-left ${
              active === item.key
                ? 'bg-plimYellow text-plimBlueDark'
                : 'text-white/85 hover:bg-white/10'
            }`}
          >
            <span className="text-base leading-none">{item.icon}</span>
            {item.key}
          </button>
        ))}
      </nav>

      <div className="mt-auto px-5 py-3 text-[10px] text-white/40 font-mono">
        v12 · 10 ago 18:52
      </div>
    </aside>
  );
}
