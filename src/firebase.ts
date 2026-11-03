import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { doc, getFirestore, onSnapshot, setDoc } from 'firebase/firestore';
import config from './firebaseConfig.json';

// Proyecto de Firebase propio de Mil (src/firebaseConfig.json). Sin configurar, la app funciona solo en el dispositivo.
export const firebaseReady = Boolean(config.apiKey && config.projectId);
const app = firebaseReady ? initializeApp(config) : null;
export const auth = (app ? getAuth(app) : null) as ReturnType<typeof getAuth>;
const db = (app ? getFirestore(app) : null) as ReturnType<typeof getFirestore>;

export const watchUser = (cb: (u: User | null) => void) => {
  if (!firebaseReady) { cb(null); return () => undefined; }
  return onAuthStateChanged(auth, cb);
};
export const loginGoogle = () => signInWithPopup(auth, new GoogleAuthProvider());
export const loginEmail = (e: string, p: string) => signInWithEmailAndPassword(auth, e, p);
export const registerEmail = (e: string, p: string) => createUserWithEmailAndPassword(auth, e, p);
export const logout = () => signOut(auth);

// Datos de cada persona en mil_users/{uid}, en un solo documento (JSON).
const ref = (uid: string) => doc(db, 'mil_users', uid);
export const watchCloud = (uid: string, cb: (json: string | null) => void, onError: (e: Error) => void) =>
  onSnapshot(ref(uid), (s) => cb(s.exists() ? (s.data().json as string) : null), onError);
export const saveCloud = (uid: string, json: string) => setDoc(ref(uid), { json, updatedAt: Date.now() });

export const authMessage = (e: unknown) => {
  const code = (e as { code?: string }).code || '';
  const map: Record<string, string> = {
    'auth/invalid-credential': 'Correo o contraseña incorrectos.',
    'auth/email-already-in-use': 'Ese correo ya tiene cuenta. Inicia sesión.',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
    'auth/invalid-email': 'El correo no es válido.',
    'auth/unauthorized-domain': 'Esta dirección no está autorizada en Firebase (Authentication > Configuración > Dominios autorizados).',
    'auth/popup-closed-by-user': 'Cerraste la ventana de Google antes de terminar.',
    'auth/popup-blocked': 'El navegador bloqueó la ventana de Google. Permite ventanas emergentes.',
    'auth/operation-not-allowed': 'Este método de acceso no está activado en Firebase.',
  };
  return map[code] || (e as Error).message || 'No se pudo iniciar sesión.';
};
