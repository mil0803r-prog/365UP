import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { BarChart3, Calendar, CheckSquare, Flame, Sparkles, Target } from 'lucide-react';
import { StoreProvider, uid, useCloud, useStore } from './store';
import { supabaseReady, logout, watchUser, type AppUser } from './supabase';
import Login from './components/Login';
import { PALETTES, applyPalette, initialPalette } from './palettes';
import { Check } from 'lucide-react';
import { Header, Sheet } from './components/ui';
import Hoy from './components/Hoy';
import Tareas from './components/Tareas';
import Metas from './components/Metas';
import Metricas from './components/Metricas';
import Agenda, { EventForm } from './components/Agenda';
import { googleConnected, pushEvent } from './google';
import type { AgendaEvent, Tab } from './types';

const TABS: [Tab, string, typeof Flame][] = [
  ['hoy', 'Hoy', Flame],
  ['tareas', 'Tareas', CheckSquare],
  ['metas', 'Metas', Target],
  ['metricas', 'Métricas', BarChart3],
  ['agenda', 'Agenda', Calendar],
];

applyPalette(initialPalette());

function Shell({ user }: { user: AppUser | null }) {
  const [themeOpen, setThemeOpen] = useState(false);
  const cloud = useCloud();
  const [tab, setTab] = useState<Tab>('hoy');
  const [bell, setBell] = useState(false);
  const [fab, setFab] = useState(false);
  const [habit, setHabit] = useState(false);
  const [event, setEvent] = useState<AgendaEvent | null>(null);
  const { state, update } = useStore();
  const palette = state.palette || initialPalette();
  useEffect(() => { applyPalette(palette); }, [palette]);
  const first = (user?.name || user?.email?.split('@')[0] || '').split(' ')[0];
  const today = format(new Date(), 'yyyy-MM-dd');
  const todays = state.events.filter((e) => e.date === today);
  const pending = state.tasks.filter((t) => t.date === today && t.status === 'pending');

  async function saveEvent(e: AgendaEvent) {
    let ev = e;
    if (googleConnected()) ev = { ...e, googleId: await pushEvent(e).catch(() => undefined) };
    update((s) => ({ ...s, events: [...s.events, ev] }));
    setEvent(null);
  }

  return (
    <div className="mx-auto min-h-full max-w-xl pb-28">
      <Header name={first} onTheme={() => setThemeOpen(true)} onBell={() => setBell(true)} dot={todays.length + pending.length > 0} />
      {tab === 'hoy' && <Hoy go={setTab} onAdd={() => setTab('tareas')} />}
      {tab === 'tareas' && <Tareas />}
      {tab === 'metas' && <Metas />}
      {tab === 'metricas' && <Metricas />}
      {tab === 'agenda' && <Agenda openNew={() => undefined} />}

      <button onClick={() => setFab(true)} className="fixed bottom-28 right-4 z-30 grid h-16 w-16 place-items-center rounded-full border-2 border-cyan-400/60 bg-[var(--inner)] text-cyan-300 shadow-[0_0_30px_rgba(34,211,238,.4)]"><Sparkles size={28} /></button>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-cyan-400/10 bg-[var(--nav)] px-3 pb-4 pt-2 backdrop-blur">
        <div className="mx-auto grid max-w-xl grid-cols-5 gap-1">
          {TABS.map(([k, l, Icon]) => (
            <button key={k} onClick={() => setTab(k)} className={`flex flex-col items-center gap-1 rounded-2xl py-2 text-sm ${tab === k ? 'border border-cyan-400/40 bg-cyan-400/10 font-extrabold text-cyan-300' : 'text-slate-400'}`}><Icon size={26} />{l}{tab === k && <i className="h-1.5 w-1.5 rounded-full bg-cyan-400" />}</button>
          ))}
        </div>
      </nav>

      {bell && (
        <Sheet title="Notificaciones de hoy" onClose={() => setBell(false)}>
          <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-slate-950/50 p-3 text-sm">
            <div className="min-w-0"><p className="truncate font-bold">{user ? user.email : 'Sin cuenta'}</p><p className="text-slate-400">{user ? { sincronizando: 'Sincronizando…', guardado: 'Guardado en la nube', error: 'Sin conexión con la nube (revisa las reglas de Firestore)', local: '' }[cloud] : 'Datos solo en este dispositivo'}</p></div>
            {user ? <button className="chip shrink-0" onClick={() => logout()}>Cerrar sesión</button> : <button className="chip shrink-0" onClick={() => { try { localStorage.removeItem('mil-guest'); } catch { /* sin almacenamiento */ } location.reload(); }}>Iniciar sesión</button>}
          </div>
          {todays.length + pending.length === 0 && <p className="text-slate-400">Nada pendiente por hoy.</p>}
          <ul className="space-y-2">
            {todays.map((e) => <li key={e.id} className="rounded-2xl bg-slate-950/50 p-3 font-bold">📅 {e.title} {e.start && <span className="text-slate-400">· {e.start}</span>}</li>)}
            {pending.map((t) => <li key={t.id} className="rounded-2xl bg-slate-950/50 p-3 font-bold">☑️ {t.title}</li>)}
          </ul>
        </Sheet>
      )}

      {themeOpen && (
        <Sheet title="Elige tu paleta" onClose={() => setThemeOpen(false)}>
          <div className="grid grid-cols-3 gap-3">
            {PALETTES.map((p) => (
              <button key={p.id} onClick={() => update((s) => ({ ...s, palette: p.id }))} className={`rounded-2xl border p-2 text-center ${palette === p.id ? 'border-cyan-400 ring-2 ring-cyan-400/40' : 'border-cyan-400/15'}`}>
                <span className="relative block h-16 overflow-hidden rounded-xl" style={{ background: `linear-gradient(160deg, ${p.bg1}, ${p.bg0})` }}>
                  <i className="absolute left-2 top-2 block h-5 w-10 rounded-md" style={{ background: p.card, border: `1px solid ${p.a1}55` }} />
                  <i className="absolute bottom-2 left-2 block h-3 w-12 rounded-full" style={{ background: `linear-gradient(90deg, ${p.a1}, ${p.a2})` }} />
                  {palette === p.id && <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full" style={{ background: p.a1, color: '#000' }}><Check size={12} /></span>}
                </span>
                <span className="mt-1.5 block text-xs font-bold">{p.name}</span>
              </button>
            ))}
          </div>
        </Sheet>
      )}

      {fab && (
        <Sheet title="Crear" onClose={() => setFab(false)}>
          <div className="grid gap-3">
            <button className="btn" onClick={() => { setFab(false); setTab('tareas'); }}>Nueva tarea</button>
            <button className="btn" onClick={() => { setFab(false); setHabit(true); }}>Nuevo hábito</button>
            <button className="btn" onClick={() => { setFab(false); setTab('metas'); }}>Nueva meta</button>
            <button className="btn" onClick={() => { setFab(false); setEvent({ id: uid(), title: '', date: today, kind: 'evento' }); }}>Nuevo evento (Google Calendar)</button>
          </div>
        </Sheet>
      )}
      {habit && <HabitForm onClose={() => setHabit(false)} />}
      {event && <EventForm ev={event} isNew onSave={(e) => saveEvent(e)} onDelete={() => undefined} onClose={() => setEvent(null)} />}
    </div>
  );
}

function HabitForm({ onClose }: { onClose: () => void }) {
  const { update } = useStore();
  const [name, setName] = useState('');
  const [period, setPeriod] = useState<'mañana' | 'noche'>('mañana');
  return (
    <Sheet title="Nuevo hábito" onClose={onClose}>
      <div className="space-y-3">
        <input className="input" placeholder="Ej. Leer 10 páginas" value={name} onChange={(e) => setName(e.target.value)} />
        <select className="input" value={period} onChange={(e) => setPeriod(e.target.value as 'mañana' | 'noche')}><option value="mañana">Matutino</option><option value="noche">Nocturno</option></select>
        <button className="btn w-full" disabled={!name.trim()} onClick={() => { update((s) => ({ ...s, habits: [...s.habits, { id: uid(), name: name.trim(), period, log: {} }] })); onClose(); }}>Guardar</button>
      </div>
    </Sheet>
  );
}

export default function App() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [checked, setChecked] = useState(false);
  const [guest, setGuest] = useState(() => {
    try { return localStorage.getItem('mil-guest') === '1'; } catch { return false; }
  });
  useEffect(() => watchUser((u) => { setUser(u); setChecked(true); }), []);
  if (!checked) return <div className="grid h-full place-items-center text-slate-400">Cargando…</div>;
  if (!user && !guest && supabaseReady) return <Login onSkip={() => { setGuest(true); try { localStorage.setItem('mil-guest', '1'); } catch { /* sin almacenamiento */ } }} />;
  return (
    <StoreProvider key={user?.id || 'guest'} uid={user?.id}>
      <Shell user={user} />
    </StoreProvider>
  );
}
