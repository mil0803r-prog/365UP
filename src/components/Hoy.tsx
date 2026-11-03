import { CheckCircle2, Flame, Plus, Sparkles, Target, ArrowRight, Check } from 'lucide-react';
import { format } from 'date-fns';
import { useStore } from '../store';
import { CATEGORY_COLORS, Empty, Progress, Section } from './ui';
import { streak } from '../metrics';
import type { Tab } from '../types';

export default function Hoy({ go, onAdd }: { go: (t: Tab) => void; onAdd: () => void }) {
  const { state, update } = useStore();
  const today = format(new Date(), 'yyyy-MM-dd');
  const tasks = state.tasks.filter((t) => t.date === today && t.status !== 'cancelled');
  const events = state.events.filter((e) => e.date === today);
  const pending = [
    ...tasks.filter((t) => t.status !== 'done').map((t) => ({ id: t.id, title: t.title, time: t.time, ev: false })),
    ...events.filter((e) => !e.done).map((e) => ({ id: e.id, title: e.title, time: e.start, ev: true })),
  ].sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
  const total = state.habits.length + tasks.length + events.length;
  const done = state.habits.filter((h) => h.log[today]).length + tasks.filter((t) => t.status === 'done').length + events.filter((e) => e.done).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const goals = state.goals.slice(0, 4);
  const racha = streak(state.habits);

  return (
    <div className="px-5 pb-6">
      <div className="card flex items-center gap-5 p-5">
        <div className="grid h-28 w-28 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(var(--a1) ${pct * 3.6}deg, rgba(var(--line),.14) 0)` }}>
          <div className="grid h-[88px] w-[88px] place-items-center rounded-full bg-[var(--inner)] text-center">
            <div><p className="text-3xl font-black leading-none">{pct}%</p><p className="text-xs font-extrabold tracking-widest text-cyan-400">HOY</p></div>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1 text-xs font-extrabold text-amber-300"><Flame size={14} /> {racha} DÍAS DE RACHA</span>
          <p className="mt-2 text-2xl font-extrabold">{total ? (pct === 100 ? '¡Día completo!' : 'En marcha') : 'Tablero en Cero'}</p>
          <p className="text-slate-400"><b className="text-cyan-400">{done}</b> de {total} hábitos y tareas listos</p>
          <div className="mt-3"><Progress value={pct} /></div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3">
        {[
          ['Hábitos', `${state.habits.filter((h) => h.log[today]).length}/${state.habits.length}`],
          ['Tareas', `${tasks.filter((t) => t.status === 'done').length + events.filter((e) => e.done).length}/${tasks.length + events.length}`],
          ['Metas', `${state.goals.length ? Math.round((state.goals.reduce((a, g) => a + Math.min(1, g.current / g.target), 0) / state.goals.length) * 100) : 0}%`],
        ].map(([l, v]) => (
          <div key={l} className="card px-3 py-3 text-center">
            <p className="text-2xl font-black text-cyan-300">{v}</p>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{l}</p>
          </div>
        ))}
      </div>

      <Section icon={<Target />} title="Metas Activas" right={<button className="chip" onClick={() => go('metas')}>Gestionar</button>} />
      <div className="flex gap-3 overflow-x-auto pb-1">
        {goals.map((g) => {
          const p = Math.round((g.current / g.target) * 100);
          return (
            <div key={g.id} className="card min-w-[260px] max-w-[300px] p-5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-slate-400"><i className="h-2.5 w-2.5 rounded-full" style={{ background: CATEGORY_COLORS[g.category] || '#22d3ee' }} />{g.category}</span>
                <span className="chip">{p}%</span>
              </div>
              <p className="mt-3 truncate text-lg font-extrabold">{g.title}</p>
              <p className="mt-2"><span className="text-3xl font-black text-cyan-300">{g.money ? '$' : ''}{g.current} {g.money ? '' : g.unit}</span> <span className="text-slate-400">/ {g.target} {g.money ? '' : g.unit}</span></p>
              <div className="mt-3 flex justify-between text-sm text-slate-400"><span>Progreso</span><b className="text-cyan-300">{p}%</b></div>
              <div className="mt-1"><Progress value={p} /></div>
            </div>
          );
        })}
      </div>

      <Section icon={<CheckCircle2 />} title="Hábitos de Hoy" right={<span className="chip">{state.habits.length} asignados</span>} />
      {state.habits.length === 0 ? (
        <Empty icon={<Sparkles />} title="Sin hábitos configurados" text="Todo está en cero. Pulsa el botón flotante (+) para agregar tus propios hábitos matutinos y nocturnos." />
      ) : (
        <div className="card divide-y divide-cyan-400/10">
          {(['mañana', 'noche'] as const).map((per) => {
            const list = state.habits.filter((h) => h.period === per);
            if (!list.length) return null;
            return (
              <div key={per}>
                <p className="px-4 pt-3 text-xs font-extrabold uppercase tracking-widest text-slate-400">{per === 'mañana' ? '☀️ Mañana' : '🌙 Noche'}</p>
                {list.map((h) => (
                  <button key={h.id} className="flex w-full items-center gap-3 p-4 text-left" onClick={() => update((s) => ({ ...s, habits: s.habits.map((x) => (x.id === h.id ? { ...x, log: { ...x.log, [today]: !x.log[today] } } : x)) }))}>
                    <span className={`grid h-7 w-7 place-items-center rounded-full border ${h.log[today] ? 'border-cyan-400 bg-cyan-400 on-accent' : 'border-slate-600'}`}>{h.log[today] && <Check size={16} />}</span>
                    <span className={`flex-1 font-bold ${h.log[today] ? 'text-slate-500 line-through' : ''}`}>{h.name}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}

      <div className="card mt-5 p-5">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-3 text-xl font-extrabold"><i className="h-3 w-3 rounded-full bg-cyan-400" />Tareas Prioritarias</h2>
          <span className="chip">{pending.length} pendientes</span>
        </div>
        {pending.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-lg font-extrabold">Sin tareas pendientes</p>
            <p className="mt-1 text-slate-400">No tienes pendientes registrados para hoy.</p>
            <button onClick={onAdd} className="mt-3 inline-flex items-center gap-1 font-bold text-cyan-300"><Plus size={16} /> Agregar Tarea</button>
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {pending.slice(0, 5).map((t) => (
              <li key={t.id} className="flex items-center gap-3 rounded-2xl bg-slate-950/50 p-3">
                <button onClick={() => update((s) => t.ev ? { ...s, events: s.events.map((x) => (x.id === t.id ? { ...x, done: true } : x)) } : { ...s, tasks: s.tasks.map((x) => (x.id === t.id ? { ...x, status: 'done' } : x)) })} className="h-6 w-6 rounded-full border border-slate-500" />
                <span className="flex-1 font-bold">{t.title}</span>
                {t.time && <span className="text-sm text-slate-400">{t.time}</span>}
              </li>
            ))}
          </ul>
        )}
        <button onClick={() => go('tareas')} className="btn mt-3 flex w-full items-center justify-center gap-2">Ver todas las tareas <ArrowRight size={18} /></button>
      </div>
    </div>
  );
}
