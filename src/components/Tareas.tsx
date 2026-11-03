import { useState } from 'react';
import { addDays, addWeeks, endOfWeek, format, startOfWeek, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, ChevronLeft, ChevronRight, ListChecks, Plus, RotateCcw, Trash2, Zap, Check } from 'lucide-react';
import { uid, useStore } from '../store';
import { CATEGORIES, CATEGORY_COLORS, Empty } from './ui';
import type { AgendaEvent, Priority, Task } from '../types';
import { googleConnected, pushEvent, removeEvent } from '../google';

export default function Tareas() {
  const { state, update } = useStore();
  const [cursor, setCursor] = useState(new Date());
  const [day, setDay] = useState<Date | null>(new Date());
  const [filter, setFilter] = useState('Todas');
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');
  const [cat, setCat] = useState('Trabajo');
  const [prio, setPrio] = useState<Priority>('Normal');

  const all: Task[] = [
    ...state.tasks,
    ...state.events.map((e): Task => ({ id: 'ev:' + e.id, title: e.title, date: e.date, time: e.start, category: 'Evento', priority: 'Normal', status: e.done ? 'done' : 'pending' })),
  ];
  const ws = startOfWeek(cursor, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  const fmt = (d: Date) => format(d, 'yyyy-MM-dd');
  const countFor = (d: Date) => all.filter((t) => t.date === fmt(d) && t.status !== 'cancelled').length;
  const weekTasks = all.filter((t) => t.date >= fmt(ws) && t.date <= fmt(endOfWeek(ws, { weekStartsOn: 1 })));
  const visible = (day ? all.filter((t) => t.date === fmt(day)) : weekTasks)
    .filter((t) => (filter === 'Todas' ? true : filter === 'Alta Prioridad' ? t.priority === 'Alta' : t.category === filter))
    .sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
  const dayDone = visible.filter((t) => t.status === 'done').length;
  const pct = visible.length ? Math.round((dayDone / visible.length) * 100) : 0;
  const label = day ? format(day, "EEEE d", { locale: es }) : 'la semana';

  // Una tarea nueva se guarda como evento de la agenda: es la misma tarea en la app y en Google Calendar.
  const add = async () => {
    if (!title.trim()) return;
    const target = day || new Date();
    let ev: AgendaEvent = {
      id: uid(),
      title: title.trim(),
      date: fmt(target),
      start: time || undefined,
      kind: 'evento',
      notes: `Categoría: ${cat} · Prioridad: ${prio}`,
    };
    setTitle('');
    setTime('');
    if (googleConnected()) {
      try { ev = { ...ev, googleId: await pushEvent(ev) }; } catch { /* queda en la app y se sube al sincronizar */ }
    }
    update((s) => ({ ...s, events: [...s.events, ev] }));
  };
  const deleteEvent = async (id: string) => {
    const ev = state.events.find((e) => e.id === id);
    if (ev?.googleId && googleConnected()) await removeEvent(ev.googleId);
    update((s) => ({ ...s, events: s.events.filter((e) => e.id !== id) }));
  };
  const setStatus = (id: string, status: 'pending' | 'done' | 'postponed' | 'cancelled') => id.startsWith('ev:') ? update((s) => ({ ...s, events: s.events.map((e) => (e.id === id.slice(3) ? { ...e, done: status === 'done' } : e)) })) : update((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, status } : t)) }));

  return (
    <div className="px-5 pb-6">
      <div className="card p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl border border-cyan-400/30 text-cyan-300"><Calendar /></div>
          <div className="flex-1">
            <p className="text-xl font-extrabold capitalize">{format(ws, 'MMMM yyyy', { locale: es })}</p>
            <span className="chip text-xs">Semana {format(ws, 'I')}</span>
            <p className="text-sm text-slate-400">{format(ws, 'd MMM', { locale: es })} al {format(endOfWeek(ws, { weekStartsOn: 1 }), 'd MMM', { locale: es })}</p>
          </div>
          <button className="chip p-2" onClick={() => setCursor(addWeeks(cursor, -1))}><ChevronLeft size={18} /></button>
          <button className="chip flex items-center gap-1" onClick={() => { setCursor(new Date()); setDay(new Date()); }}><RotateCcw size={14} /> Hoy</button>
          <button className="chip p-2" onClick={() => setCursor(addWeeks(cursor, 1))}><ChevronRight size={18} /></button>
        </div>
        <div className="mt-4 grid grid-cols-7 gap-1.5">
          {days.map((d) => {
            const sel = day && isSameDay(d, day);
            return (
              <button key={d.toISOString()} onClick={() => setDay(d)} className={`rounded-2xl border py-2 text-center ${sel ? 'border-cyan-300 bg-gradient-to-b from-cyan-400 to-blue-600' : 'border-cyan-400/15 bg-slate-900/50'}`}>
                <p className="text-[10px] font-bold uppercase text-slate-300">{isSameDay(d, new Date()) ? 'Hoy' : format(d, 'EEE', { locale: es })}</p>
                <p className="text-2xl font-black">{format(d, 'd')}</p>
                <p className="text-xs text-slate-300">● {countFor(d)}</p>
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex gap-2 border-t border-cyan-400/10 pt-3 text-sm">
          <button onClick={() => setDay(day || new Date())} className={`chip ${day ? 'bg-cyan-400/20' : ''}`}>Día: {format(day || new Date(), 'EEE d', { locale: es })}</button>
          <button onClick={() => setDay(null)} className={`chip ${!day ? 'bg-cyan-400/20' : ''}`}>Toda la semana ({weekTasks.length})</button>
        </div>
      </div>

      <div className="card mt-4 p-5">
        <div className="flex items-center justify-between">
          <p className="text-xl font-extrabold capitalize">Ritmo del {label}</p>
          <span className="chip">{pct}%</span>
        </div>
        <p className="mt-1 text-slate-400">{dayDone} de {visible.length} completadas</p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-950"><div className="h-full bg-gradient-to-r from-cyan-400 to-blue-500" style={{ width: `${pct}%` }} /></div>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {['Todas', 'Alta Prioridad', 'Trabajo', 'Finanzas', 'Personal'].map((c) => (
          <button key={c} onClick={() => setFilter(c)} className={`chip whitespace-nowrap ${filter === c ? '!bg-cyan-400 on-accent' : ''}`}>{c}</button>
        ))}
      </div>

      <div className="mt-4">
        {visible.length === 0 ? (
          <Empty icon={<ListChecks />} title={`Sin tareas para el ${label}`} text="Programa un nuevo pendiente abajo y mantén tu ritmo imparable." />
        ) : (
          <ul className="space-y-2">
            {visible.map((t) => (
              <li key={t.id} className="card flex items-center gap-3 p-4">
                <button onClick={() => setStatus(t.id, t.status === 'done' ? 'pending' : 'done')} className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border ${t.status === 'done' ? 'border-cyan-400 bg-cyan-400 on-accent' : 'border-slate-500'}`}>{t.status === 'done' && <Check size={16} />}</button>
                <div className="min-w-0 flex-1">
                  <p className={`font-bold ${t.status === 'done' || t.status === 'cancelled' ? 'text-slate-500 line-through' : ''}`}>{t.title}</p>
                  <p className="flex items-center gap-2 text-xs text-slate-400"><i className="h-2 w-2 rounded-full" style={{ background: CATEGORY_COLORS[t.category] }} />{t.category}{t.time && ` · ${t.time}`}{t.priority === 'Alta' && <b className="text-rose-400">Alta</b>}{t.status === 'postponed' && <b className="text-amber-400">Pospuesta</b>}</p>
                </div>
                {!t.id.startsWith('ev:') && <button onClick={() => setStatus(t.id, 'postponed')} className="text-xs text-amber-300">Posponer</button>}
                <button onClick={() => (t.id.startsWith('ev:') ? deleteEvent(t.id.slice(3)) : update((s) => ({ ...s, tasks: s.tasks.filter((x) => x.id !== t.id) })))} className="text-rose-400"><Trash2 size={18} /></button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card mt-5 p-5">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-xl font-extrabold"><Zap className="text-cyan-300" /> Captura Rápida de Pendiente</h3>
          <span className="chip text-xs">Para: {format(day || new Date(), 'EEE d MMM', { locale: es })}</span>
        </div>
        <input className="input mt-3" placeholder={`¿Qué pendiente resuelves el ${format(day || new Date(), 'EEEE', { locale: es })}?`} value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <div className="mt-3 flex flex-wrap gap-2">
          <input type="time" className="input !w-auto" value={time} onChange={(e) => setTime(e.target.value)} />
          <select className="input !w-auto" value={cat} onChange={(e) => setCat(e.target.value)}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
          <select className="input !w-auto" value={prio} onChange={(e) => setPrio(e.target.value as Priority)}><option>Normal</option><option>Alta</option></select>
        </div>
        <button onClick={add} className="btn mt-3 inline-flex items-center gap-2"><Plus size={18} /> Añadir Tarea</button>
      </div>
    </div>
  );
}
