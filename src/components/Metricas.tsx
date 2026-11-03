import { useState } from 'react';
import { Area, AreaChart, ResponsiveContainer, XAxis, Tooltip } from 'recharts';
import { Check, Flame, Network, Wallet, Zap } from 'lucide-react';
import { useStore } from '../store';
import { compute, streak, type Range } from '../metrics';
import { DEFAULT_PALETTE, PALETTES } from '../palettes';

export default function Metricas() {
  const { state } = useStore();
  const pal = PALETTES.find((x) => x.id === (state.palette || DEFAULT_PALETTE)) || PALETTES[0];
  const [r, setR] = useState<Range>('mes');
  const m = compute(state, r);
  const rac = streak(state.habits);
  const max = Math.max(1, ...m.heat.map((h) => h.n));
  const lvl = (n: number) => (n === 0 ? 'bg-slate-900/60' : n / max > 0.66 ? 'bg-cyan-400' : n / max > 0.33 ? 'bg-cyan-600' : 'bg-cyan-900');
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  const onTime = m.tasks ? m.doneT / m.tasks : 0;

  return (
    <div className="space-y-4 px-5 pb-6">
      <div className="card grid grid-cols-3 gap-1 p-2">
        {([['semana', 'Semana'], ['mes', 'Mes'], ['anio', 'Año']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setR(k)} className={`rounded-2xl py-2.5 font-extrabold ${r === k ? 'bg-gradient-to-r from-cyan-400 to-blue-600' : 'text-slate-400'}`}>{l}</button>
        ))}
      </div>

      <div className="card flex items-center justify-between p-5">
        <div>
          <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-cyan-300"><Zap size={16} />Índice de consistencia</p>
          <p className="mt-2 text-3xl font-black">Apex Score</p>
          <p className="text-slate-400">Sinergia entre disciplina y resultados</p>
          <span className="chip mt-3 inline-block">— {m.apex}% este {r === 'anio' ? 'año' : r}</span>
        </div>
        <div className="grid h-28 w-28 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(var(--a1) ${m.apex * 3.6}deg, rgba(var(--line),.14) 0)` }}>
          <div className="grid h-[88px] w-[88px] place-items-center rounded-full bg-[var(--inner)] text-center"><div><p className="text-4xl font-black">{m.apex}</p><p className="text-xs text-cyan-400">/100</p></div></div>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-start justify-between"><div><p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">Correlación multivariable</p><p className="text-xl font-extrabold">Hábitos vs. Capacidad de Ahorro</p></div><Network className="text-cyan-300" /></div>
        <div className="mt-3 h-36">
          {m.habitDone === 0 ? <p className="grid h-full place-items-center text-sm text-slate-500">0 datos registrados en este período</p> : (
            <ResponsiveContainer><AreaChart data={m.weeks}><XAxis dataKey="name" stroke="#64748b" fontSize={11} /><Tooltip contentStyle={{ background: pal.bg0, color: pal.a1, border: `1px solid ${pal.a1}55`, borderRadius: 12 }} /><Area dataKey="habitos" stroke={pal.a1} fill={pal.a1 + "33"} /></AreaChart></ResponsiveContainer>
          )}
        </div>
        <p className="mt-3 rounded-2xl bg-slate-950/50 p-4 text-sm text-slate-300"><b className="text-cyan-300">DESCUBRIMIENTO INTELIGENTE</b><br />Registra tus hábitos diarios y tareas para activar el cálculo de correlación automática. Tasa inicial: <b>{pct(m.habitDone ? m.taskPct : 0)}</b>.</p>
      </div>

      <div className="card p-5">
        <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Densidad temporal</p>
        <p className="mb-3 text-xl font-extrabold">Mapa de Calor (30 Días)</p>
        <div className="grid grid-cols-6 gap-2">
          {m.heat.map((h, i) => (
            <div key={h.d} className={`grid aspect-square place-items-center rounded-xl border border-cyan-400/10 text-xs font-bold text-slate-300 ${lvl(h.n)}`}>{i === 29 ? 'HOY' : h.d.slice(8)}</div>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Distribución operativa</p>
        <div className="flex items-center justify-between"><p className="text-xl font-extrabold">Rendimiento de Tareas</p><span className="chip">{m.doneT} Completadas</span></div>
        <div className="mt-4 flex items-center gap-6">
          <div className="grid h-28 w-28 place-items-center rounded-full" style={{ background: `conic-gradient(var(--a1) ${onTime * 360}deg, rgba(var(--line),.14) 0)` }}><div className="grid h-[88px] w-[88px] place-items-center rounded-full bg-[var(--inner)] text-center"><div><p className="text-2xl font-black">{pct(onTime)}</p><p className="text-xs text-slate-400">Completado</p></div></div></div>
          <div className="flex-1 space-y-2 text-sm">
            {[['A tiempo', onTime, '#38bdf8'], ['Pospuestas', m.tasks ? m.postponed / m.tasks : 0, '#ca8a04'], ['Canceladas', m.tasks ? m.cancelled / m.tasks : 0, '#e11d48']].map(([l, v, c]) => (
              <div key={l as string} className="flex justify-between"><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full" style={{ background: c as string }} />{l as string}</span><b>{pct(v as number)}</b></div>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex justify-between"><div><p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Hitos &amp; reconocimiento</p><p className="text-xl font-extrabold">Insignias Desbloqueadas</p></div><span className="text-sm text-slate-400">{[rac >= 7, m.goalPct >= 1, onTime >= 0.8 && m.tasks > 0].filter(Boolean).length}/3 este mes</span></div>
        {[
          [<Wallet key="a" />, 'Máster de Finanzas', 'Nivel 0', state.goals.some((g) => g.money && g.current >= g.target) ? 'Meta de ahorro cumplida' : '0 meses de ahorro registrados'],
          [<Flame key="b" />, 'Racha Imparable', `${rac} Días`, 'Comienza completando tus hábitos dia…'],
          [<Check key="c" />, 'Eficiencia Total', `${pct(onTime)} Hit`, m.tasks ? `${m.doneT} de ${m.tasks} tareas completadas` : '0 tareas registradas aún'],
        ].map(([ic, t, lv, d]) => (
          <div key={t as string} className="mt-3 flex items-center gap-4 rounded-2xl border border-cyan-400/10 bg-slate-950/40 p-4"><div className="grid h-12 w-12 place-items-center rounded-xl bg-slate-900 text-slate-400">{ic}</div><div className="flex-1"><p className="font-extrabold">{t}</p><p className="text-sm text-slate-400">{d}</p></div><span className="text-sm text-slate-400">{lv}</span></div>
        ))}
      </div>
    </div>
  );
}
