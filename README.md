# VideoCal — calendario compartido de videos

Landing page + calendario colaborativo para dos personas. Cada día se pinta según el
estado del video que le toca publicar, sin necesidad de abrir nada:

| Color | Significado | Estado interno |
| --- | --- | --- |
| Sin color | No hay video asignado ese día | `empty` |
| **Rojo** | **DaemonCS** asignó el video | `pending` |
| **Verde** | **Enzo Editor** confirmó que ya está listo | `ready` |
| Mitad verde / mitad rojo | Hay videos listos y pendientes el mismo día | `mixed` |

Las páginas donde se publica cada video son **GGDROP** y **LLAVEDROP** de fábrica, y se
pueden agregar más (con su propio color) desde la sección **Páginas**. Las páginas
preestablecidas no se pueden borrar.

## Quién llena qué

| Campo | DaemonCS (usuario 1) | Enzo Editor (usuario 2) |
| --- | --- | --- |
| Página y título | Sí | Sí |
| Enlace del video | No | Sí |
| Notas | No | Sí |
| Marcar como listo | Sí | Sí |

No es solo cosa de la interfaz: `applyUpsertAssignment` descarta el enlace y las notas
cuando el autor es el usuario 1, así que el título se puede editar sin miedo a borrar lo
que el usuario 2 ya había pegado.

### Miniaturas

Al guardar el enlace, la miniatura aparece en la lista del día (y se previsualiza mientras
se pega el enlace). Se obtiene sin llamar a ninguna API externa: para YouTube se construye
la URL de `i.ytimg.com/vi/<id>/hqdefault.jpg` a partir del enlace (`watch`, `youtu.be`,
`shorts`, `embed`, `live`); las imágenes sueltas se muestran tal cual. Vimeo y otros
proveedores muestran un marcador con su nombre, porque no exponen una miniatura pública
por URL. En el calendario, cada chip lleva un triángulo cuando el video ya tiene enlace.

## Stack

- **Next.js 16** (App Router, TypeScript, Turbopack)
- **Tailwind CSS v4**
- **GSAP 3.15** + `@gsap/react` (SplitText, ScrollTrigger)
- **Inter** y **JetBrains Mono** vía `next/font` (tipografía de interfaz y numérica)
- Persistencia pluggable: **Upstash Redis** en producción, archivo local en desarrollo

La página arranca directamente en el calendario (sin hero): título, leyenda de colores,
cuadrícula del mes y las páginas.

## Uso local

```bash
npm install
npm run dev     # http://localhost:3000
```

Sin variables de entorno el estado se guarda en `.data/state.json` (ignorado por git).
La app muestra un aviso cuando corre en memoria (modo demo) porque no hay dónde escribir.

### Identidad

Los dos nombres son fijos (`USER_NAMES` en `lib/presets.ts`): **DaemonCS** asigna los
videos (rojo) y **Enzo Editor** confirma que están listos (verde). El selector **"Actuando
como"** del encabezado (se guarda en `localStorage`) decide con cuál de los dos ordena la
interfaz, y queda registrado quién hizo cada cambio.

### Acceso del usuario 2

Entrar como **Enzo Editor** pide un **PIN numérico privado**. El PIN vive únicamente en la
variable de entorno `USER2_PIN` del servidor:

- No está en el código fuente, ni en el bundle del navegador, ni en la interfaz.
- `POST /api/session` compara el PIN (tiempo constante + límite de intentos) y devuelve un
  token solo si acierta. Ese token se guarda en el navegador de esa persona.
- Todas las mutaciones hechas como usuario 2 (por ejemplo confirmar un video) exigen el
  token: sin él, el servidor responde `401 USER2_PIN_REQUIRED`, así que cambiar de
  identidad a mano en el navegador no sirve de nada.
- Sin `USER2_PIN` configurado, el usuario 2 no puede entrar y el resto funciona igual.

El botón de candado junto al selector cierra la sesión del usuario 2 en ese navegador.

### Animaciones

- Título principal con `SplitText` enmascarado por líneas.
- Revelados al hacer scroll, transiciones al cambiar de mes y animaciones de entrada del
  panel de día y de los avisos.
- Respeta `prefers-reduced-motion`. Para forzarlas o apagarlas en cualquier navegador:
  `?motion=force` / `?motion=off`.

## Desplegar en Vercel

1. Sube el repo a GitHub e impórtalo en Vercel (`Framework: Next.js`, sin configuración
   extra).
2. En **Settings → Environment Variables** agrega `USER2_PIN` con el PIN privado del
   usuario 2 (sin esta variable nadie puede entrar como Enzo Editor) y, si quieres avisos,
   las del canal elegido (`RESEND_API_KEY` + `NOTIFY_EMAIL_TO`, o `WHATSAPP_PHONE` +
   `WHATSAPP_APIKEY`, o `NOTIFY_WEBHOOK_URL`).
3. Crea la base de datos: **Storage → Marketplace → Upstash Redis** y conéctala al
   proyecto. Vercel inyecta `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`
   (también se aceptan `KV_REST_API_URL` / `KV_REST_API_TOKEN`).
4. Deploy. Con la base conectada los dos ven los mismos datos desde cualquier
   dispositivo; si la app muestra el aviso amarillo de **modo demo**, el Redis no quedó
   configurado.

> Sin base de datos la app funciona igual, pero en Vercel el disco es de solo lectura y los
> cambios viven solo en memoria (se pierden al reiniciar). El banner amarillo lo avisa
> dentro de la propia página.

## Avisos cuando un video queda listo

Cuando **Enzo Editor** pasa un video de *pendiente* a *listo*, **DaemonCS** recibe el aviso
con la página, la fecha, el título, el enlace y la miniatura del video. Detalles:

- Sale del servidor, en el mismo `PATCH /api/assignments`, pero **después de responder**
  (`after()` de Next), así que guardar nunca espera a Resend, CallMeBot o al webhook.
- Se dispara solo en la transición *pendiente → listo*: reabrir un video o volver a
  confirmar algo que ya estaba verde no manda aviso repetido.
- Cada canal se activa solo con sus variables de entorno; sin ninguna, el aviso queda
  únicamente en los logs y la app funciona igual.

### Correo (Resend)

1. Crea una cuenta en [resend.com](https://resend.com) y copia una **API Key**.
2. Configura `RESEND_API_KEY`, `NOTIFY_EMAIL_TO` y, si ya tienes dominio propio,
   `NOTIFY_EMAIL_FROM` (por defecto `onboarding@resend.dev`, que solo puede enviarle al
   correo de la propia cuenta de Resend).
3. El correo lleva la miniatura del video, un resumen del día y un botón al calendario.

### WhatsApp (CallMeBot)

Gratis para uso personal. Quien recibe el aviso debe hacerlo una sola vez:

1. Agrega el número **+34 694 23 41 84** a sus contactos.
2. Envíale por WhatsApp el mensaje `I allow callmebot to send me messages`.
3. El bot responde con una apikey: guárdala en `WHATSAPP_APIKEY` y pon tu número (con
   código de país) en `WHATSAPP_PHONE`.

### Webhook

Con `NOTIFY_WEBHOOK_URL` el servidor hace un `POST` con JSON a lo que pongas ahí: sirve
para Make, Zapier, n8n, un bot de Telegram/Discord o la WhatsApp Cloud API de Meta vía
Twilio.

```json
{
  "event": "video-ready",
  "page": "LLAVEDROP",
  "date": "2026-10-06",
  "title": "Sorteo de llaves",
  "url": "https://www.youtube.com/shorts/abc",
  "thumbnail": "https://i.ytimg.com/vi/abc/hqdefault.jpg",
  "confirmedBy": "Enzo Editor",
  "assignedBy": "DaemonCS",
  "readyForDay": 1,
  "totalForDay": 2,
  "dayComplete": false,
  "test": false,
  "calendarUrl": "https://tu-calendario.vercel.app",
  "text": "Video publicado en LLAVEDROP…"
}
```

### Comprobar que quedó bien

- `GET /api/notify` dice qué canales están activos (sin exponer credenciales).
- En la app, debajo del calendario, hay una fila con el estado de cada canal.
- Entrando como usuario 2 aparece el botón **Probar aviso**, que manda un aviso de prueba
  por todos los canales configurados (`POST /api/notify`).

## API

| Método | Ruta | Para qué |
| --- | --- | --- |
| `POST` | `/api/session` | `{ pin }` → `{ token }` para entrar como usuario 2 (`GET` avisa si hay PIN configurado) |
| `GET` | `/api/notify` | Qué canales de aviso están configurados |
| `POST` | `/api/notify` | Manda un aviso de prueba (requiere el token del usuario 2) |
| `GET` | `/api/state` | Estado completo (páginas y videos) |
| `POST` | `/api/assignments` | Crear o editar el video de un día: `{ date, pageId, title, url, notes, actor }` (como `user2` requiere la cabecera `x-user2-token`) |
| `PATCH` | `/api/assignments` | `{ id, status: "assigned" \| "ready", actor }` (como `user2` requiere la cabecera `x-user2-token`) |
| `DELETE` | `/api/assignments?id=` | Quitar un video del día |
| `POST` | `/api/pages` | `{ name, accent }` |
| `DELETE` | `/api/pages?id=` | Borrar una página personalizada (y sus videos) |

## Scripts

```bash
npm run dev        # desarrollo
npm run build      # build de producción
npm run start      # servidor de producción
npm run typecheck  # tsc --noEmit
```
