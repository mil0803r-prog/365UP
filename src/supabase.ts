import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import config from './supabaseConfig.json';

// Proyecto de Supabase de 365UP (src/supabaseConfig.json). Sin configurar, la app funciona solo en el dispositivo.
export const supabaseReady = Boolean(config.url && config.anonKey);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = (supabaseReady ? createClient(config.url, config.anonKey) : null) as unknown as SupabaseClient<any, 'public', any>;

export interface AppUser {
  id: string;
  email?: string;
  name?: string;
}

const toUser = (s: Session | null): AppUser | null =>
  s ? { id: s.user.id, email: s.user.email, name: (s.user.user_metadata?.full_name as string | undefined) || undefined } : null;

export const watchUser = (cb: (u: AppUser | null) => void) => {
  if (!supabaseReady) { cb(null); return () => undefined; }
  supabase.auth.getSession().then(({ data }) => cb(toUser(data.session)));
  const { data } = supabase.auth.onAuthStateChange((_e, s) => cb(toUser(s)));
  return () => data.subscription.unsubscribe();
};

export const loginGoogle = async () => {
  const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
  if (error) throw error;
};
export const loginEmail = async (email: string, password: string) => {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
};
export const registerEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  if (!data.session) throw new Error('Revisa tu correo para confirmar la cuenta y luego inicia sesión.');
};
export const logout = () => supabase.auth.signOut();

// Datos de cada persona en public.user_state (una fila por usuario). El estado va como texto dentro de data.json.
export const saveCloud = async (uid: string, json: string) => {
  const { error } = await supabase.from('user_state').upsert({ user_id: uid, data: { json }, updated_at: new Date().toISOString() });
  if (error) throw error;
};

const fetchCloud = async (uid: string): Promise<string | null> => {
  const { data, error } = await supabase.from('user_state').select('data').eq('user_id', uid).maybeSingle();
  if (error) throw error;
  return data ? ((data.data as { json?: string }).json ?? null) : null;
};

// Lee al abrir y luego cada 15 s y al volver a la pestaña, así los cambios de otro dispositivo llegan solos.
export const watchCloud = (uid: string, cb: (json: string | null) => void, onError: (e: Error) => void) => {
  let stop = false;
  const pull = () => fetchCloud(uid).then((j) => { if (!stop) cb(j); }).catch((e) => { if (!stop) onError(e as Error); });
  pull();
  const t = setInterval(() => { if (!document.hidden) pull(); }, 15000);
  const vis = () => { if (!document.hidden) pull(); };
  document.addEventListener('visibilitychange', vis);
  return () => { stop = true; clearInterval(t); document.removeEventListener('visibilitychange', vis); };
};

export const authMessage = (e: unknown) => {
  const m = ((e as Error)?.message || '').toLowerCase();
  if (m.includes('invalid login')) return 'Correo o contraseña incorrectos.';
  if (m.includes('already registered') || m.includes('already been registered')) return 'Ese correo ya tiene cuenta. Inicia sesión.';
  if (m.includes('password should be')) return 'La contraseña debe tener al menos 6 caracteres.';
  if (m.includes('valid email') || m.includes('invalid email')) return 'El correo no es válido.';
  if (m.includes('email not confirmed')) return 'Confirma tu correo antes de entrar (revisa tu bandeja).';
  if (m.includes('provider is not enabled') || m.includes('unsupported provider')) return 'Google todavía no está activado en Supabase.';
  if (m.includes('rate limit')) return 'Demasiados intentos. Espera unos minutos.';
  return (e as Error)?.message || 'No se pudo iniciar sesión.';
};
