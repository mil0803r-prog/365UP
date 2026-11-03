import type { AgendaEvent } from './types';

// El ID de cliente es público (no es un secreto). VITE_GOOGLE_CLIENT_ID lo reemplaza si se define.
const DEFAULT_CLIENT_ID = '207633457231-fsout64po1r9efjob7gf5cq32j8j98de.apps.googleusercontent.com';
const CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) || DEFAULT_CLIENT_ID;
const SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

let token: { value: string; exp: number } | null = null;

export const googleConfigured = () => Boolean(CLIENT_ID);
export const googleConnected = () => Boolean(token && token.exp > Date.now());

function loadGis(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).google?.accounts?.oauth2) return resolve();
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('No se pudo cargar Google Identity Services'));
    document.head.appendChild(s);
  });
}

export async function connectGoogle(): Promise<void> {
  if (!CLIENT_ID) throw new Error('Falta VITE_GOOGLE_CLIENT_ID (ver .env.example)');
  await loadGis();
  await new Promise<void>((resolve, reject) => {
    const client = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: (r: any) => {
        if (r.error) return reject(new Error(r.error));
        token = { value: r.access_token, exp: Date.now() + (Number(r.expires_in) - 60) * 1000 };
        resolve();
      },
      error_callback: (e: any) => reject(new Error(e?.type || 'Autorización cancelada')),
    });
    client.requestAccessToken({ prompt: token ? '' : 'consent' });
  });
}

async function call(url: string, init?: RequestInit) {
  if (!googleConnected()) await connectGoogle();
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token!.value}`, 'Content-Type': 'application/json', ...init?.headers },
  });
  if (res.status === 204) return null;
  if (!res.ok) throw new Error(`Google Calendar ${res.status}: ${await res.text()}`);
  return res.json();
}

function addDay(date: string) {
  const d = new Date(date + 'T00:00:00');
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function toGoogle(e: AgendaEvent) {
  const body: Record<string, unknown> = {
    summary: (e.kind === 'recordatorio' ? '🔔 ' : '') + e.title,
    description: e.notes,
  };
  if (e.start) {
    const end = e.end || new Date(new Date(`${e.date}T${e.start}`).getTime() + 3600_000).toTimeString().slice(0, 5);
    body.start = { dateTime: `${e.date}T${e.start}:00`, timeZone: TZ };
    body.end = { dateTime: `${e.date}T${end}:00`, timeZone: TZ };
  } else {
    body.start = { date: e.date };
    body.end = { date: addDay(e.date) };
  }
  return body;
}

function fromGoogle(g: any): AgendaEvent | null {
  if (g.status === 'cancelled') return null;
  const dt: string | undefined = g.start?.dateTime;
  const title: string = g.summary || '(sin título)';
  const reminder = title.startsWith('🔔 ');
  return {
    id: 'g-' + g.id,
    googleId: g.id,
    title: reminder ? title.slice(3) : title,
    date: dt ? dt.slice(0, 10) : g.start?.date,
    start: dt?.slice(11, 16),
    end: g.end?.dateTime?.slice(11, 16),
    kind: reminder ? 'recordatorio' : 'evento',
    notes: g.description,
  };
}

export async function pushEvent(e: AgendaEvent): Promise<string> {
  const r = await call(API, { method: 'POST', body: JSON.stringify(toGoogle(e)) });
  return r.id;
}
export async function patchEvent(e: AgendaEvent) {
  if (e.googleId) await call(`${API}/${e.googleId}`, { method: 'PATCH', body: JSON.stringify(toGoogle(e)) });
}
export async function removeEvent(googleId: string) {
  await call(`${API}/${googleId}`, { method: 'DELETE' }).catch(() => null);
}

export const SYNC_FROM = () => new Date(Date.now() - 60 * 86400_000);
export const SYNC_TO = () => new Date(Date.now() + 180 * 86400_000);

export async function pullEvents(): Promise<AgendaEvent[]> {
  const out: AgendaEvent[] = [];
  let pageToken = '';
  do {
    const q = new URLSearchParams({
      timeMin: SYNC_FROM().toISOString(),
      timeMax: SYNC_TO().toISOString(),
      singleEvents: 'true',
      maxResults: '250',
      ...(pageToken ? { pageToken } : {}),
    });
    const r = await call(`${API}?${q}`);
    for (const g of r.items || []) {
      const ev = fromGoogle(g);
      if (ev) out.push(ev);
    }
    pageToken = r.nextPageToken || '';
  } while (pageToken);
  return out;
}
