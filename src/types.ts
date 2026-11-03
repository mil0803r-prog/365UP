export type Priority = 'Normal' | 'Alta';
export type TaskStatus = 'pending' | 'done' | 'postponed' | 'cancelled';
export type EventKind = 'evento' | 'recordatorio';

export interface Task {
  id: string;
  title: string;
  date: string; // yyyy-MM-dd
  time?: string; // HH:mm
  category: string;
  priority: Priority;
  status: TaskStatus;
}

export interface Habit {
  id: string;
  name: string;
  period: 'mañana' | 'noche';
  log: Record<string, boolean>; // yyyy-MM-dd -> hecho
}

export interface Goal {
  id: string;
  title: string;
  category: string;
  scope: 'mensual' | 'anual';
  target: number;
  current: number;
  unit: string;
  deadline: string; // "Octubre" | "2026"
  money?: boolean;
}

export interface AgendaEvent {
  id: string;
  title: string;
  date: string; // yyyy-MM-dd
  start?: string; // HH:mm
  end?: string; // HH:mm
  kind: EventKind;
  notes?: string;
  googleId?: string;
  done?: boolean;
}

export interface AppState {
  tasks: Task[];
  habits: Habit[];
  goals: Goal[];
  events: AgendaEvent[];
  seedApplied: string[];
  googleLinked: boolean;
  palette?: string;
}

export type Tab = 'hoy' | 'tareas' | 'metas' | 'metricas' | 'agenda';
