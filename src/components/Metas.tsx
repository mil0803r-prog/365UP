import { useState } from 'react';
import { Calendar, Pencil, Plus, Sparkles, Target, Trash2, TrendingUp } from 'lucide-react';
import { uid, useStore } from '../store';
import { CATEGORIES, CATEGORY_COLORS, Progress, Sheet } from './ui';
import type { Goal } from '../types';

export default function Metas() {
  const { state, update } = useStore();
  const [tab, setTab] = useState<'mensual' | 'anual' | 'todas'>('mensual');
  const [editing, setEditing] = useState<Goal | null>(null);
  const goals = state.goals.filter((g) => tab === 'todas' || g.scope === tab);
  const personal = goals.filter((g) => !g.money);
  const money = goals.filter((g) => g.money);
  const moneyCur = money.reduce((a, g) => a + g.current, 0);
  const moneyTar = money.reduce((a, g) => a + g.target, 0);
  const moneyPct = moneyTar ? Math.round((moneyCur / moneyTar) * 100) : 0;
  const done = personal.filter((g) => g.current >= g.target).length;
  const cumplimiento = personal.length ? Math.round((personal.reduce((a, g) => a + Math.min(1, g.current / g.target), 0) / personal.length) * 100) : 0;
  const count = (s: string) => state.goals.filter((g) => s === 'todas' || g.scope === s).length;

  const blank = (scope: 'mensual' | 'anual'): Goal => ({ id: uid(), title: '', category: 'Desarrollo', scope, target: 10, current: 0, unit: 'u.', deadline: scope === 'anual' ? String(new Date().getFullYear()) : new Date().toLocaleDateString('es', { month: 'long' }).replace(/^./, (c) => c.toUpperCase()) });
  const save = (g: Goal) => { update((s) => ({ ...s, goals: s.goals.some((x) => x.id === g.id) ? s.goals.map((x) => (x.id === g.id ? g : x)) : [...s.goals, g] })); setEditing(null); };
  const add = (id: string, n: number) => update((s) => ({ ...s, goals: s.goals.map((g) => (g.id === id ? { ...g, current: g.current + n } : g)) }));

  return (
    <div className="px-5 pb-6">
      <div className="flex items-center gap-4 py-2">
        <div className="grid h-16 w-16 place-items-center rounded-2xl border border-cyan-400/30 text-cyan-300"><Target size={28} /></div>
        <div className="flex-1"><h2 className="text-2xl font-black">Registro de Metas</h2><p className="text-slate-400">{count('mensual')} metas mensuales activas</p></div>
        <button className="btn !px-4 text-sm" onClick={() => setEditing(blank('mensual'))}>+ Meta Mensual</button>
      </div>

      <div className="card mt-3 grid grid-cols-3 gap-1 p-2">
        {([['mensual', 'Metas Mensuales'], ['anual', 'Metas Anuales'], ['todas', 'Todas']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-extrabold ${tab === k ? 'bg-gradient-to-r from-cyan-400 to-blue-600' : 'text-slate-400'}`}>{l} <span className="rounded-full bg-black/60 px-2 text-xs">{count(k)}</span></button>
        ))}
      </div>

      <div className="card mt-4 p-5">
        <div className="flex justify-between"><p className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-slate-400"><i className="h-2.5 w-2.5 rounded-full bg-emerald-400" />Ahorro &amp; Finanzas del mes</p><span className="chip !border-emerald-400/30 !text-emerald-300"><TrendingUp size={14} className="mr-1 inline" />{moneyPct}%</span></div>
        <p className="mt-2 text-4xl font-black">${moneyCur} <span className="text-lg font-semibold text-slate-400">/ ${moneyTar}</span></p>
        <p className="text-right text-slate-400">{money.length} metas</p>
        <Progress value={moneyPct} />
      </div>

      <div className="card mt-4 p-5">
        <div className="flex justify-between"><p className="text-sm font-extrabold uppercase tracking-wider text-slate-400"><i className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-cyan-400" />Cumplimiento personal mensual</p><span className="chip"><Sparkles size={14} className="mr-1 inline" />{cumplimiento}%</span></div>
        <p className="mt-2 text-4xl font-black">{done} de {personal.length} <span className="text-lg text-cyan-300">{personal.length} activas</span></p>
      </div>

      <div className="mt-6 flex items-center justify-between"><h2 className="text-xl font-extrabold"><i className="mr-3 inline-block h-3 w-3 rounded-full bg-cyan-400" />Metas Personales del Mes</h2><span className="chip">{personal.length} Activas</span></div>
      <div className="mt-3 space-y-3">
        {goals.map((g) => {
          const p = Math.round((g.current / g.target) * 100);
          return (
            <div key={g.id} className="card p-5">
              <div className="flex items-center justify-between">
                <span className="chip flex items-center gap-1 text-xs uppercase"><Calendar size={14} />{g.scope}</span>
                <div className="flex gap-2">
                  <button onClick={() => setEditing(g)} className="rounded-xl border border-cyan-400/20 p-2 text-slate-300"><Pencil size={16} /></button>
                  <button onClick={() => update((s) => ({ ...s, goals: s.goals.filter((x) => x.id !== g.id) }))} className="rounded-xl border border-rose-400/30 p-2 text-rose-400"><Trash2 size={16} /></button>
                </div>
              </div>
              <p className="mt-3 text-lg font-extrabold">{g.title}</p>
              <p className="flex items-center gap-2 text-slate-400"><i className="h-2.5 w-2.5 rounded-full" style={{ background: CATEGORY_COLORS[g.category] }} />{g.category} • Plazo: {g.deadline}</p>
              <div className="mt-3 flex items-end justify-between"><p><span className="text-3xl font-black text-cyan-300">{g.current} {g.unit}</span> <span className="text-slate-400">/ {g.target} {g.unit}</span></p><b className="text-cyan-300">{p}%</b></div>
              <div className="mt-2"><Progress value={p} /></div>
              <p className="mt-2 text-sm text-slate-400">{g.current >= g.target ? '¡Meta cumplida! 🎉' : `Faltan ${g.target - g.current} ${g.unit}`}</p>
              <div className="mt-3 flex items-center justify-between border-t border-cyan-400/10 pt-3 text-sm text-slate-400">Sumar avance:
                <span className="flex gap-2"><button className="chip" onClick={() => add(g.id, 1)}>+1 u.</button><button className="chip !bg-cyan-400 on-accent" onClick={() => add(g.id, 5)}>+5 u.</button></span>
              </div>
            </div>
          );
        })}
      </div>
      <button className="btn mt-4 flex w-full items-center justify-center gap-2" onClick={() => setEditing(blank(tab === 'anual' ? 'anual' : 'mensual'))}><Plus size={18} /> Registrar Nueva Meta {tab === 'anual' ? 'Anual' : 'Mensual'}</button>

      {editing && <GoalForm goal={editing} onSave={save} onClose={() => setEditing(null)} />}
    </div>
  );
}

function GoalForm({ goal, onSave, onClose }: { goal: Goal; onSave: (g: Goal) => void; onClose: () => void }) {
  const [g, setG] = useState(goal);
  const set = <K extends keyof Goal>(k: K, v: Goal[K]) => setG({ ...g, [k]: v });
  return (
    <Sheet title="Meta" onClose={onClose}>
      <div className="space-y-3">
        <input className="input" placeholder="¿Qué quieres lograr?" value={g.title} onChange={(e) => set('title', e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <select className="input" value={g.category} onChange={(e) => set('category', e.target.value)}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
          <select className="input" value={g.scope} onChange={(e) => set('scope', e.target.value as Goal['scope'])}><option value="mensual">Mensual</option><option value="anual">Anual</option></select>
          <input className="input" type="number" min={1} value={g.target} onChange={(e) => set('target', Number(e.target.value) || 1)} />
          <input className="input" value={g.unit} onChange={(e) => set('unit', e.target.value)} placeholder="Unidad" />
        </div>
        <input className="input" value={g.deadline} onChange={(e) => set('deadline', e.target.value)} placeholder="Plazo" />
        <label className="flex items-center gap-2 text-slate-300"><input type="checkbox" checked={!!g.money} onChange={(e) => set('money', e.target.checked)} /> Es meta de ahorro / finanzas ($)</label>
        <button className="btn w-full" disabled={!g.title.trim()} onClick={() => onSave(g)}>Guardar</button>
      </div>
    </Sheet>
  );
}
