import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { saveCloud, watchCloud } from './firebase';
import seed from './data/agenda.json';
import type { AgendaEvent, AppState } from './types';

const KEY = 'mil-app-state-v1';

const initial: AppState = {
  tasks: [],
  habits: [],
  goals: [
    {
      id: 'goal-libro',
      title: 'Leer libro el arte de hablar con cualquier persona',
      category: 'Desarrollo',
      scope: 'mensual',
      target: 20,
      current: 0,
      unit: 'u.',
      deadline: 'Octubre',
    },
  ],
  events: [],
  seedApplied: [],
  googleLinked: false,
};

// Aplica los eventos de src/data/agenda.json (programaciones enviadas por chat) una sola vez por id.
function withSeed(s: AppState): AppState {
  const fresh = (seed as AgendaEvent[]).filter((e) => !s.seedApplied.includes(e.id));
  if (!fresh.length) return s;
  return {
    ...s,
    events: [...s.events, ...fresh.filter((e) => !s.events.some((x) => x.id === e.id))],
    seedApplied: [...s.seedApplied, ...fresh.map((e) => e.id)],
  };
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    return withSeed(raw ? { ...initial, ...JSON.parse(raw) } : initial);
  } catch {
    return withSeed(initial);
  }
}

interface Ctx {
  state: AppState;
  update: (fn: (s: AppState) => AppState) => void;
}
const StoreCtx = createContext<Ctx>(null as never);

export type CloudStatus = 'local' | 'sincronizando' | 'guardado' | 'error';
const CloudCtx = createContext<CloudStatus>('local');
export const useCloud = () => useContext(CloudCtx);

export function StoreProvider({ children, uid }: { children: ReactNode; uid?: string }) {
  const [state, setState] = useState<AppState>(load);
  const [cloud, setCloud] = useState<CloudStatus>(uid ? 'sincronizando' : 'local');
  const lastJson = useRef('');
  const ready = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Nube: baja los datos de la cuenta; si no hay, sube los locales. Los cambios de otros dispositivos llegan solos.
  useEffect(() => {
    if (!uid) { setCloud('local'); return; }
    ready.current = false;
    setCloud('sincronizando');
    return watchCloud(
      uid,
      (json) => {
        if (json === null) {
          lastJson.current = JSON.stringify(stateRef.current);
          saveCloud(uid, lastJson.current).then(() => setCloud('guardado')).catch(() => setCloud('error'));
        } else if (json !== lastJson.current) {
          lastJson.current = json;
          setState(withSeed({ ...initial, ...JSON.parse(json) }));
          setCloud('guardado');
        } else setCloud('guardado');
        ready.current = true;
      },
      () => setCloud('error'),
    );
  }, [uid]);

  useEffect(() => {
    if (!uid || !ready.current) return;
    const json = JSON.stringify(state);
    if (json === lastJson.current) return;
    setCloud('sincronizando');
    const t = setTimeout(() => {
      lastJson.current = json;
      saveCloud(uid, json).then(() => setCloud('guardado')).catch(() => setCloud('error'));
    }, 800);
    return () => clearTimeout(t);
  }, [state, uid]);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* almacenamiento no disponible */
    }
  }, [state]);
  const value = useMemo(() => ({ state, update: (fn: (s: AppState) => AppState) => setState(fn) }), [state]);
  return (
    <CloudCtx.Provider value={cloud}>
      <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>
    </CloudCtx.Provider>
  );
}

export const useStore = () => useContext(StoreCtx);
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
