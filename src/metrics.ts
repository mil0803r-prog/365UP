import { addDays, differenceInCalendarDays, format, startOfMonth, startOfWeek, startOfYear } from 'date-fns';
import type { AppState, Habit } from './types';

const f = (d: Date) => format(d, 'yyyy-MM-dd');

export function streak(habits: Habit[]): number {
  if (!habits.length) return 0;
  let n = 0;
  let d = new Date();
  if (!habits.every((h) => h.log[f(d)])) d = addDays(d, -1);
  while (habits.every((h) => h.log[f(d)])) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

export type Range = 'semana' | 'mes' | 'anio';

export function rangeStart(r: Range): Date {
  const now = new Date();
  return r === 'semana' ? startOfWeek(now, { weekStartsOn: 1 }) : r === 'mes' ? startOfMonth(now) : startOfYear(now);
}

export function compute(s: AppState, r: Range) {
  const from = rangeStart(r);
  const days = differenceInCalendarDays(new Date(), from) + 1;
  const dates = Array.from({ length: days }, (_, i) => f(addDays(from, i)));

  const habitSlots = s.habits.length * days;
  const habitDone = s.habits.reduce((a, h) => a + dates.filter((d) => h.log[d]).length, 0);
  const habitPct = habitSlots ? habitDone / habitSlots : 0;

  const tasks = s.tasks.filter((t) => t.date >= dates[0] && t.date <= dates[dates.length - 1]);
  const evs = s.events.filter((e) => e.date >= dates[0] && e.date <= dates[dates.length - 1]);
  const total = tasks.length + evs.length;
  const doneT = tasks.filter((t) => t.status === 'done').length + evs.filter((e) => e.done).length;
  const postponed = tasks.filter((t) => t.status === 'postponed').length;
  const cancelled = tasks.filter((t) => t.status === 'cancelled').length;
  const taskPct = total ? doneT / total : 0;

  const goalPct = s.goals.length ? s.goals.reduce((a, g) => a + Math.min(1, g.current / g.target), 0) / s.goals.length : 0;
  const apex = Math.round((habitPct * 0.4 + taskPct * 0.4 + goalPct * 0.2) * 100);

  const heat = Array.from({ length: 30 }, (_, i) => {
    const d = f(addDays(new Date(), i - 29));
    const n = s.habits.filter((h) => h.log[d]).length + s.tasks.filter((t) => t.date === d && t.status === 'done').length;
    return { d, n };
  });

  const weeks = Array.from({ length: 5 }, (_, i) => {
    const ws = addDays(startOfMonth(new Date()), i * 7);
    const wd = Array.from({ length: 7 }, (_, k) => f(addDays(ws, k)));
    return { name: `Sem ${i + 1}`, habitos: s.habits.reduce((a, h) => a + wd.filter((d) => h.log[d]).length, 0) };
  });

  return { apex, habitDone, doneT, tasks: total, postponed, cancelled, taskPct, heat, weeks, goalPct };
}
