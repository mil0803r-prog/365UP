import { useState } from 'react';
import { authMessage, loginEmail, loginGoogle, registerEmail } from '../firebase';

export default function Login({ onSkip }: { onSkip: () => void }) {
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setErr('');
    try { await fn(); } catch (e) { setErr(authMessage(e)); } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto grid min-h-full max-w-md content-center gap-5 px-6 py-10">
      <div>
        <h1 className="text-5xl font-black tracking-tight">365UP</h1>
        <p className="mt-2 text-slate-400">Hábitos, tareas, metas y agenda. Entra para tener tus datos en todos tus dispositivos.</p>
      </div>
      <div className="card grid gap-3 p-5">
        <button disabled={busy} className="btn" onClick={() => run(loginGoogle)}>Continuar con Google</button>
        <p className="text-center text-sm text-slate-500">o con tu correo</p>
        <input className="input" type="email" autoComplete="email" placeholder="Correo" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="input" type="password" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} placeholder="Contraseña" value={pass} onChange={(e) => setPass(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && email && pass && run(() => (mode === 'in' ? loginEmail : registerEmail)(email, pass))} />
        <button disabled={busy || !email || !pass} className="btn" onClick={() => run(() => (mode === 'in' ? loginEmail : registerEmail)(email, pass))}>{mode === 'in' ? 'Entrar' : 'Crear cuenta'}</button>
        <button className="text-sm text-cyan-300" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>{mode === 'in' ? '¿No tienes cuenta? Créala' : 'Ya tengo cuenta'}</button>
        {err && <p className="text-sm text-rose-400">{err}</p>}
      </div>
      <button className="text-sm text-slate-400" onClick={onSkip}>Continuar sin cuenta (solo en este dispositivo)</button>
    </div>
  );
}
