import { useEffect, useMemo, useRef, useState } from 'react';
import { addDays, addMonths, endOfMonth, format, isSameDay, startOfMonth, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Check, ChevronLeft, ChevronRight, Plus, RefreshCw } from 'lucide-react';
import { uid, useStore } from '../store';
import { Empty, Sheet } from './ui';
import { connectGoogle, googleConfigured, googleConnected, patchEvent, pullEvents, pushEvent, removeEvent, SYNC_FROM, SYNC_TO } from '../google';
import type { AgendaEvent, AppState } from '../types';

const KIND_COLOR = { evento: '#3b82f6', tarea: '#10b981', habito: '#22d3ee', recordatorio: '#f59e0b' } as const;
type Item = { id: string; title: string; kind: keyof typeof KIND_COLOR; time?: string; event?: AgendaEvent };
const fmt = (d: Date) => format(d, 'yyyy-MM-dd');

function itemsFor(s: AppState, date: string): Item[] {
  const ev: Item[] = s.events.filter((e) => e.date === date).map((e) => ({ id: e.id, title: e.title, kind: e.kind, time: e.start, event: e }));
  const tk: Item[] = s.tasks.filter((t) => t.date === date && t.status !== 'cancelled').map((t) => ({ id: t.id, title: t.title, kind: 'tarea', time: t.time }));
  const hb: Item[] = s.habits.length && (date === fmt(new Date()) || s.habits.some((h) => h.log[date])) ? [{ id: 'h-' + date, title: `Hábitos (${s.habits.filter((h) => h.log[date]).length}/${s.habits.length})`, kind: 'habito' }] : [];
  return [...ev, ...tk, ...hb].sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
}

export default function Agenda({ openNew }: { openNew: (date: string) => void }) {
  const { state, update } = useStore();
  const [view, setView] = useState<'Mes' | 'Semana' | 'Agenda'>('Mes');
  const [month, setMonth] = useState(new Date());
  const [sel, setSel] = useState(new Date());
  const [filter, setFilter] = useState('Todos');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [edit, setEdit] = useState<AgendaEvent | null>(null);

  const gcount = state.events.filter((e) => e.googleId).length;
  const grid = useMemo(() => {
    const s = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const n = Math.ceil((endOfMonth(month).getDate() + ((startOfMonth(month).getDay() + 6) % 7)) / 7) * 7;
    return Array.from({ length: n }, (_, i) => addDays(s, i));
  }, [month]);
  const KIND_OF: Record<string, string> = { Eventos: 'evento', Tareas: 'tarea', Hábitos: 'habito', Recordatorios: 'recordatorio' };
  const dayItems = itemsFor(state, fmt(sel)).filter((i) => filter === 'Todos' || i.kind === KIND_OF[filter]);

  async function sync(silent = false) {
    if (silent && !googleConnected()) return;
    setBusy(true);
    setMsg('');
    try {
      if (!googleConnected()) await connectGoogle();
      const remote = await pullEvents();
      const from = fmt(SYNC_FROM());
      const to = fmt(SYNC_TO());
      // 1) subir los locales que aún no están en Google
      const local = state.events.filter((e) => !e.googleId);
      const pushed = new Map<string, string>();
      for (const e of local) pushed.set(e.id, await pushEvent(e));
      // 2) combinar: Google es la fuente para lo que ya está vinculado
      update((s) => {
        const remoteIds = new Set(remote.map((r) => r.googleId));
        const kept = s.events
          .map((e) => (pushed.has(e.id) ? { ...e, googleId: pushed.get(e.id) } : e))
          .filter((e) => !e.googleId || e.date < from || e.date > to || remoteIds.has(e.googleId) || pushed.has(e.id));
        const known = new Set(kept.map((e) => e.googleId).filter(Boolean));
        const added = remote.filter((r) => !known.has(r.googleId));
        const refreshed = kept.map((e) => (e.googleId ? remote.find((r) => r.googleId === e.googleId) ? { ...e, ...remote.find((r) => r.googleId === e.googleId)!, id: e.id } : e : e));
        return { ...s, events: [...refreshed, ...added], googleLinked: true };
      });
      setMsg(`Sincronizado: ${local.length} subidos, ${remote.length} en Google.`);
    } catch (e) {
      if (!silent) setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function saveEvent(e: AgendaEvent, isNew: boolean) {
    let ev = e;
    if (googleConnected()) {
      try {
        if (isNew || !e.googleId) ev = { ...e, googleId: await pushEvent(e) };
        else await patchEvent(e);
      } catch (err) { setMsg((err as Error).message); }
    }
    update((s) => ({ ...s, events: isNew ? [...s.events, ev] : s.events.map((x) => (x.id === ev.id ? ev : x)) }));
    setEdit(null);
  }
  async function delEvent(e: AgendaEvent) {
    if (e.googleId && googleConnected()) await removeEvent(e.googleId);
    update((s) => ({ ...s, events: s.events.filter((x) => x.id !== e.id) }));
    setEdit(null);
  }

  // Sincronización automática mientras la sesión de Google esté activa: al abrir, cada 2 min y al volver a la app.
  const syncRef = useRef(sync);
  syncRef.current = sync;
  useEffect(() => {
    const run = () => { if (!document.hidden) void syncRef.current(true); };
    const t = setInterval(run, 120_000);
    document.addEventListener('visibilitychange', run);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', run); };
  }, []);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(sel, { weekStartsOn: 1 }), i));
  const upcoming = Array.from({ length: 60 }, (_, i) => fmt(addDays(new Date(), i))).map((d) => ({ d, items: itemsFor(state, d).filter((i) => i.kind !== 'habito') })).filter((x) => x.items.length);

  const ItemRow = ({ i }: { i: Item }) => (
    <div className="flex w-full items-center gap-3 rounded-2xl bg-slate-950/50 p-3 text-left">
      {i.event ? (
        <button aria-label="Completar" onClick={() => update((s) => ({ ...s, events: s.events.map((x) => (x.id === i.id ? { ...x, done: !x.done } : x)) }))} className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${i.event.done ? 'border-cyan-400 bg-cyan-400 on-accent' : 'border-slate-500'}`}>{i.event.done && <Check size={14} />}</button>
      ) : <i className="h-3 w-3 rounded-full" style={{ background: KIND_COLOR[i.kind] }} />}
      <button onClick={() => i.event && setEdit(i.event)} className={`flex-1 text-left font-bold ${i.event?.done ? 'text-slate-500 line-through' : ''}`}>{i.title}</button>
      {i.time && <span className="text-sm text-slate-400">{i.time}</span>}
      {i.event?.googleId && <span title="En Google Calendar" className="text-xs text-emerald-400">●G</span>}
    </div>
  );

  return (
    <div className="px-5 pb-6">
      <div className="flex items-center justify-between">
        <span className="chip flex items-center gap-2 !px-4 !py-2 text-sm"><i className="h-3 w-3 rounded-full bg-blue-500" />Google Calendar <b className="font-normal text-slate-400">{gcount} {gcount === 1 ? 'evento' : 'eventos'}</b></span>
        <button className="btn flex items-center gap-1 !py-2.5" onClick={() => setEdit(blank(fmt(sel)))}><Plus size={18} /> Crear</button>
      </div>

      <div className="card mt-4 p-4">
        <div className="flex items-center gap-2">
          <button className="chip p-2" onClick={() => setMonth(addMonths(month, -1))}><ChevronLeft size={18} /></button>
          <p className="flex-1 text-xl font-black capitalize">{format(month, 'MMMM yyyy', { locale: es })}</p>
          <button className="chip p-2" onClick={() => setMonth(addMonths(month, 1))}><ChevronRight size={18} /></button>
          <button className="btn flex items-center gap-1 !px-3 !py-2 text-sm" onClick={() => { setMonth(new Date()); setSel(new Date()); }}><Calendar size={16} /> Hoy</button>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-1 rounded-2xl border border-cyan-400/15 p-1">
          {(['Mes', 'Semana', 'Agenda'] as const).map((v) => <button key={v} onClick={() => setView(v)} className={`rounded-xl py-2 font-extrabold ${view === v ? 'bg-gradient-to-r from-cyan-400 to-blue-600' : 'text-slate-400'}`}>{v}</button>)}
        </div>

        {view === 'Mes' && (
          <>
            <div className="mt-4 grid grid-cols-7 text-center text-sm font-bold text-slate-400">{['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => <span key={i}>{d}</span>)}</div>
            <div className="mt-2 grid grid-cols-7 gap-y-1">
              {grid.map((d) => {
                const out = d.getMonth() !== month.getMonth();
                const kinds = [...new Set(itemsFor(state, fmt(d)).map((i) => i.kind))];
                return (
                  <button key={d.toISOString()} onClick={() => { setSel(d); if (out) setMonth(d); }} className={`mx-auto flex h-12 w-12 flex-col items-center justify-center rounded-2xl ${isSameDay(d, sel) ? 'border border-cyan-300 bg-cyan-400/10 text-cyan-300' : ''} ${out ? 'text-slate-600' : ''}`}>
                    <span className="font-bold">{format(d, 'd')}</span>
                    <span className="flex h-2 gap-0.5">{kinds.slice(0, 3).map((k) => <i key={k} className="h-1.5 w-1.5 rounded-full" style={{ background: KIND_COLOR[k] }} />)}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
        {view === 'Semana' && (
          <div className="mt-4 space-y-2">
            {weekDays.map((d) => (
              <div key={d.toISOString()} className={`rounded-2xl border p-3 ${isSameDay(d, sel) ? 'border-cyan-300' : 'border-cyan-400/10'}`}>
                <button className="font-extrabold capitalize" onClick={() => setSel(d)}>{format(d, 'EEEE d', { locale: es })}</button>
                <div className="mt-2 space-y-1">{itemsFor(state, fmt(d)).map((i) => <ItemRow key={i.id} i={i} />)}{!itemsFor(state, fmt(d)).length && <p className="text-sm text-slate-500">Sin actividades</p>}</div>
              </div>
            ))}
          </div>
        )}
        {view === 'Agenda' && (
          <div className="mt-4 space-y-3">
            {upcoming.length === 0 && <p className="py-4 text-center text-slate-500">Sin próximos eventos</p>}
            {upcoming.map((g) => (
              <div key={g.d}><p className="mb-1 font-extrabold capitalize text-cyan-300">{format(new Date(g.d + 'T00:00:00'), "EEEE d 'de' MMMM", { locale: es })}</p><div className="space-y-1">{g.items.map((i) => <ItemRow key={i.id} i={i} />)}</div></div>
            ))}
          </div>
        )}
        <div className="mt-4 flex justify-center gap-4 border-t border-cyan-400/10 pt-3 text-sm text-slate-300">
          {(['evento', 'tarea', 'habito', 'recordatorio'] as const).map((k) => <span key={k} className="flex items-center gap-1.5 capitalize"><i className="h-2.5 w-2.5 rounded-full" style={{ background: KIND_COLOR[k] }} />{k === 'habito' ? 'Hábito' : k}</span>)}
        </div>
      </div>

      <div className="card mt-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <div><p className="text-xl font-black">Día {format(sel, "d 'de' MMMM yyyy", { locale: es })}</p><p className="text-slate-400">{dayItems.length ? `${dayItems.length} actividades` : 'Sin actividades registradas para este día'}</p></div>
          <button className="btn flex items-center gap-1 !px-4 !py-2" onClick={() => setEdit(blank(fmt(sel)))}><Plus size={16} /> Añadir</button>
        </div>
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {['Todos', 'Eventos', 'Tareas', 'Hábitos', 'Recordatorios'].map((f) => <button key={f} onClick={() => setFilter(f)} className={`chip whitespace-nowrap ${filter === f ? '!bg-cyan-400 on-accent' : ''}`}>{f}</button>)}
      </div>
      <div className="mt-3">
        {dayItems.length === 0 ? (
          <Empty icon={<Calendar />} title={`Sin eventos para el Día ${format(sel, 'd')}`} text="No tienes actividades registradas para esta fecha. Puedes añadir un evento nuevo fácilmente." action={<button className="btn" onClick={() => setEdit(blank(fmt(sel)))}>+ Crear Evento</button>} />
        ) : <div className="space-y-2">{dayItems.map((i) => <ItemRow key={i.id} i={i} />)}</div>}
      </div>

      <p className="mt-6 text-xs font-extrabold uppercase tracking-widest text-slate-400">Cuentas vinculadas</p>
      <div className="card mt-2 flex items-center gap-4 p-4">
        <div className="grid h-12 w-12 place-items-center rounded-xl border border-cyan-400/30 text-cyan-300"><Calendar /></div>
        <div className="flex-1"><p className="text-lg font-extrabold">Google Calendar <i className={`ml-1 inline-block h-2.5 w-2.5 rounded-full ${state.googleLinked ? 'bg-emerald-400' : 'bg-slate-600'}`} /></p><p className="text-sm text-slate-400">{state.googleLinked ? 'Sincronización bidireccional activa' : googleConfigured() ? 'Sin conectar' : 'Falta VITE_GOOGLE_CLIENT_ID'}</p></div>
        <button className="chip p-3" onClick={() => sync()} disabled={busy}><RefreshCw className={busy ? 'animate-spin' : ''} size={18} /></button>
      </div>
      <button className="btn mt-3 flex w-full items-center justify-center gap-2" onClick={() => sync()} disabled={busy}><RefreshCw size={18} className={busy ? 'animate-spin' : ''} /> Sincronizar Google Calendar</button>
      {msg && <p className="mt-2 text-center text-sm text-amber-300">{msg}</p>}

      {edit && <EventForm ev={edit} isNew={!state.events.some((x) => x.id === edit.id)} onSave={saveEvent} onDelete={delEvent} onClose={() => setEdit(null)} />}
    </div>
  );
}

const blank = (date: string): AgendaEvent => ({ id: uid(), title: '', date, kind: 'evento' });

export function EventForm({ ev, isNew, onSave, onDelete, onClose }: { ev: AgendaEvent; isNew: boolean; onSave: (e: AgendaEvent, isNew: boolean) => void; onDelete: (e: AgendaEvent) => void; onClose: () => void }) {
  const [e, setE] = useState(ev);
  const set = <K extends keyof AgendaEvent>(k: K, v: AgendaEvent[K]) => setE({ ...e, [k]: v || undefined } as AgendaEvent);
  return (
    <Sheet title={isNew ? 'Nuevo evento' : 'Editar evento'} onClose={onClose}>
      <div className="space-y-3">
        <input className="input" placeholder="Título" value={e.title} onChange={(x) => setE({ ...e, title: x.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <input type="date" className="input" value={e.date} onChange={(x) => setE({ ...e, date: x.target.value })} />
          <select className="input" value={e.kind} onChange={(x) => setE({ ...e, kind: x.target.value as AgendaEvent['kind'] })}><option value="evento">Evento</option><option value="recordatorio">Recordatorio</option></select>
          <input type="time" className="input" value={e.start || ''} onChange={(x) => set('start', x.target.value)} />
          <input type="time" className="input" value={e.end || ''} onChange={(x) => set('end', x.target.value)} />
        </div>
        <textarea className="input" rows={2} placeholder="Notas" value={e.notes || ''} onChange={(x) => set('notes', x.target.value)} />
        <button className="btn w-full" disabled={!e.title.trim()} onClick={() => onSave(e, isNew)}>Guardar{googleConnected() ? ' (y subir a Google Calendar)' : ''}</button>
        {!isNew && <button className="w-full rounded-full border border-rose-400/40 py-2.5 font-bold text-rose-400" onClick={() => onDelete(e)}>Eliminar</button>}
      </div>
    </Sheet>
  );
}
