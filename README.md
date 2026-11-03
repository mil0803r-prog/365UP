# 365UP — Hoy · Tareas · Metas · Métricas · Agenda

App móvil (React + Vite + Tailwind) con persistencia local y Agenda conectada a Google Calendar.

## Ejecutar
```
cd mil-app
npm install
cp .env.example .env   # y completa VITE_GOOGLE_CLIENT_ID
npm run dev            # http://localhost:3001
```

## Conectar Google Calendar (en la app)
1. Google Cloud Console → habilita **Google Calendar API**.
2. Credenciales → **ID de cliente OAuth (Aplicación web)**; en "Orígenes autorizados" agrega la URL de la app.
3. Pega el Client ID en `.env` (`VITE_GOOGLE_CLIENT_ID`).
4. En **Agenda → Sincronizar Google Calendar**: sube los eventos locales y trae los de Google
   (60 días atrás / 180 adelante). Con la sesión conectada, cada evento nuevo, editado o borrado también se refleja en Google.

## Programaciones enviadas por chat
Las programaciones que se envían a Claude se crean en Google Calendar y se agregan a `src/data/agenda.json`,
que la app incorpora una sola vez por `id` al iniciar. Formato:
```json
{ "id": "2026-10-08-reunion", "title": "Reunión", "date": "2026-10-08", "start": "10:00", "end": "11:00", "kind": "evento" }
```
