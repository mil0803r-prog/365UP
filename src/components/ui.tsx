import type { ReactNode } from 'react';
import { Bell, Palette, X } from 'lucide-react';

export function Header({ onBell, onTheme, dot, name }: { onBell: () => void; onTheme: () => void; dot: boolean; name: string }) {
  const h = new Date().getHours();
  const hi = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  const d0 = new Date().toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });
  const date = d0.charAt(0).toUpperCase() + d0.slice(1);
  return (
    <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-6">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-400">{date}</p>
        <h1 className="truncate text-2xl font-black tracking-tight">{hi}{name ? `, ${name}` : ''}</h1>
      </div>
      <div className="flex shrink-0 gap-2">
        <button aria-label="Colores" onClick={onTheme} className="grid h-12 w-12 place-items-center rounded-full border border-cyan-400/30 bg-cyan-400/10 text-cyan-300"><Palette size={22} /></button>
        <button aria-label="Notificaciones" onClick={onBell} className="relative grid h-12 w-12 place-items-center rounded-full border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
          <Bell size={22} />
          {dot && <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-cyan-400" />}
        </button>
      </div>
    </div>
  );
}

export function Section({ icon, title, right }: { icon: ReactNode; title: string; right?: ReactNode }) {
  return (
    <div className="mb-3 mt-6 flex items-center justify-between px-1">
      <h2 className="flex items-center gap-3 text-xl font-extrabold text-cyan-300">
        {icon}
        <span className="text-white">{title}</span>
      </h2>
      {right}
    </div>
  );
}

export function Progress({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-950/80 ring-1 ring-cyan-400/10">
      <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all" style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}

export function Empty({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-8 text-center">
      <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl border border-cyan-400/30 bg-slate-900/80 text-cyan-300">{icon}</div>
      <p className="text-lg font-extrabold">{title}</p>
      <p className="mt-2 text-slate-400">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="card max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-b-none p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-extrabold">{title}</h3>
          <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:text-white"><X /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const CATEGORY_COLORS: Record<string, string> = {
  Trabajo: '#38bdf8',
  Finanzas: '#34d399',
  Personal: '#a78bfa',
  Desarrollo: '#22d3ee',
  Salud: '#fb7185',
  Evento: '#3b82f6',
};
export const CATEGORIES = Object.keys(CATEGORY_COLORS);
