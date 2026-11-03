export interface Palette {
  id: string;
  name: string;
  light?: boolean;
  a1: string; // acento principal
  a2: string; // acento secundario (degradados)
  bg0: string; // fondo base
  bg1: string; // brillo superior del fondo
  card: string; // base de las tarjetas
}

export const PALETTES: Palette[] = [
  { id: 'oceano', name: 'Océano neón', a1: '#22d3ee', a2: '#3b6df0', bg0: '#050b18', bg1: '#0b2a4a', card: '#0a1630' },
  { id: 'esmeralda', name: 'Esmeralda', a1: '#34d399', a2: '#0d9488', bg0: '#04120e', bg1: '#0a3a2c', card: '#0a1f1a' },
  { id: 'atardecer', name: 'Atardecer', a1: '#fb923c', a2: '#e11d48', bg0: '#140808', bg1: '#4a1a14', card: '#220f0e' },
  { id: 'violeta', name: 'Violeta', a1: '#a78bfa', a2: '#7c3aed', bg0: '#0b0716', bg1: '#2a1654', card: '#150d2b' },
  { id: 'rosa', name: 'Rosa', a1: '#f472b6', a2: '#db2777', bg0: '#140610', bg1: '#4a1235', card: '#240b1c' },
  { id: 'oro', name: 'Oro', a1: '#fbbf24', a2: '#d97706', bg0: '#120d04', bg1: '#3d2c0a', card: '#1f1707' },
  { id: 'grafito', name: 'Grafito', a1: '#e5e7eb', a2: '#6b7280', bg0: '#09090b', bg1: '#1f2023', card: '#131316' },
  { id: 'claro', name: 'Claro', light: true, a1: '#0891b2', a2: '#2563eb', bg0: '#eef3f9', bg1: '#d6e8fb', card: '#ffffff' },
  { id: 'menta', name: 'Menta clara', light: true, a1: '#059669', a2: '#0d9488', bg0: '#eef7f2', bg1: '#d3f0e1', card: '#ffffff' },
];

export const DEFAULT_PALETTE = 'claro';

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (c: number[]) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
const mix = (a: string, b: string, t: number) => {
  const x = hex(a), y = hex(b);
  return toHex(x.map((v, i) => v + (y[i] - v) * t));
};
const luminance = (h: string) => {
  const [r, g, b] = hex(h).map((v) => v / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export function applyPalette(id: string) {
  const p = PALETTES.find((x) => x.id === id) || PALETTES[0];
  const s = document.documentElement.style;
  const set = (k: string, v: string) => s.setProperty(k, v);
  const line = hex(p.a1).join(',');
  set('--a1', p.a1);
  set('--a2', p.a2);
  set('--bg0', p.bg0);
  set('--bg1', p.bg1);
  set('--line', line);
  set('--on-accent', luminance(p.a1) > 0.55 ? '#0b1220' : '#ffffff');
  set('--inner', p.light ? '#ffffff' : mix(p.card, '#000000', 0.25));
  set('--nav', p.light ? 'rgba(255,255,255,.92)' : mix(p.bg0, '#000000', 0.1) + 'f2');
  set('--card-a', p.light ? '#ffffff' : mix(p.card, '#ffffff', 0.04));
  set('--card-b', p.light ? '#f7fafd' : mix(p.card, '#000000', 0.25));
  set('--fg', p.light ? '#0f172a' : '#e8f1ff');
  // Remapea los colores de Tailwind que usa la interfaz.
  const acc = p.light ? [mix(p.a1, '#000000', 0.25), mix(p.a1, '#000000', 0.1), p.a1, mix(p.a1, '#000000', 0.15), mix(p.a1, '#000000', 0.4)] : [mix(p.a1, '#ffffff', 0.3), p.a1, mix(p.a1, '#000000', 0.15), mix(p.a1, '#000000', 0.3), mix(p.a1, '#000000', 0.6)];
  ['300', '400', '500', '600', '900'].forEach((k, i) => set(`--color-cyan-${k}`, acc[i]));
  set('--color-blue-500', p.a2);
  set('--color-blue-600', mix(p.a2, '#000000', 0.12));
  if (p.light) {
    const L: Record<string, string> = { '950': '#e9f0f8', '900': '#dde8f4', '800': '#cfdceb', '700': '#b7c7da', '600': '#94a3b8', '500': '#64748b', '400': '#5b6b80', '300': '#475569' };
    Object.entries(L).forEach(([k, v]) => set(`--color-slate-${k}`, v));
    set('--color-white', '#0f172a');
  } else {
    ['950', '900', '800', '700', '600', '500', '400', '300'].forEach((k) => s.removeProperty(`--color-slate-${k}`));
    s.removeProperty('--color-white');
  }
  try { localStorage.setItem('mil-palette-v3', p.id); } catch { /* sin almacenamiento */ }
}

export function initialPalette(): string {
  try { return localStorage.getItem('mil-palette-v3') || DEFAULT_PALETTE; } catch { return DEFAULT_PALETTE; }
}
