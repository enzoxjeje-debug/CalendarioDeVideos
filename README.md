# VideoCal — calendario compartido de videos

Landing page + calendario colaborativo para dos personas. Cada dia se pinta segun el
estado del video que le toca subir, sin necesidad de abrir nada:

| Color | Significado | Estado interno |
| --- | --- | --- |
| Sin color | No hay video asignado ese dia | `empty` |
| **Rojo** | **DaemonCS** asigno el video | `pending` |
| **Verde** | **Enzo Editor** confirmo que ya esta listo | `ready` |
| Mitad verde / mitad rojo | Hay videos listos y pendientes el mismo dia | `mixed` |

Las paginas donde se publica cada video son **GGDROP** y **LLAVEDROP** de fabrica, y se
pueden agregar mas (con su propio color) desde la seccion **Paginas**. Las paginas
preestablecidas no se pueden borrar.

## Quien llena que

| Campo | DaemonCS (usuario 1) | Enzo Editor (usuario 2) |
| --- | --- | --- |
| Pagina y titulo | Si | Si |
| Link del video | No | Si |
| Notas | No | Si |
| Marcar como listo | Si | Si |

No es solo cosa de la interfaz: `applyUpsertAssignment` descarta el link y las notas
cuando el autor es el usuario 1, asi que el titulo se puede editar sin miedo a borrar lo
que el usuario 2 ya habia pegado.

### Miniaturas

Al guardar el link, la miniatura aparece en la lista del dia (y se previsualiza mientras
se pega el link). Se obtiene sin llamar a ninguna API externa: para YouTube se construye
la URL de `i.ytimg.com/vi/<id>/hqdefault.jpg` a partir del enlace (`watch`, `youtu.be`,
`shorts`, `embed`, `live`); las imagenes sueltas se muestran tal cual. Vimeo y otros
proveedores muestran un marcador con su nombre, porque no exponen una miniatura publica
por URL. En el calendario, cada chip lleva un triangulito cuando el video ya tiene link.

## Stack

- **Next.js 16** (App Router, TypeScript, Turbopack)
- **Tailwind CSS v4**
- **GSAP 3.15** + `@gsap/react` (SplitText, ScrollTrigger)
- Persistencia pluggable: **Upstash Redis** en produccion, archivo local en desarrollo

La pagina arranca directamente en el calendario (sin hero): titulo, leyenda de colores,
cuadricula del mes, paginas y una seccion corta de como funciona.

## Uso local

```bash
npm install
npm run dev     # http://localhost:3000
```

Sin variables de entorno el estado se guarda en `.data/state.json` (ignorado por git).
La app muestra un aviso cuando corre en memoria (modo demo) porque no hay donde escribir.

### Identidad

Los dos nombres son fijos (`USER_NAMES` en `lib/presets.ts`): **DaemonCS** asigna los
videos (rojo) y **Enzo Editor** confirma que estan listos (verde). El selector **"Estoy
como"** del encabezado (se guarda en `localStorage`) decide con cual de los dos ordena
la interfaz, y queda registrado quien hizo cada cambio.

### Acceso del usuario 2

Entrar como **Enzo Editor** pide un **PIN numerico privado**. El PIN vive unicamente en
la variable de entorno `USER2_PIN` del servidor:

- No esta en el codigo fuente, ni en el bundle del navegador, ni en la interfaz.
- `POST /api/session` compara el PIN (tiempo constante + limite de intentos) y devuelve
  un token solo si acierta. Ese token se guarda en el navegador de esa persona.
- Todas las mutaciones hechas como usuario 2 (por ejemplo confirmar un video) exigen el
  token: sin el, el servidor responde `401 USER2_PIN_REQUIRED`, asi que cambiar de
  identidad a mano en el navegador no sirve de nada.
- Sin `USER2_PIN` configurado, el usuario 2 no puede entrar y el resto funciona igual.

El boton de candado junto al selector cierra la sesion del usuario 2 en ese navegador.

### Animaciones

- Titulo principal con `SplitText` enmascarado por lineas.
- Revelados al hacer scroll, transiciones al cambiar de mes y animaciones de entrada del
  panel de dia y de los avisos.
- Respeta `prefers-reduced-motion`. Para forzarlas o apagarlas en cualquier navegador:
  `?motion=force` / `?motion=off`.

## Desplegar en Vercel

1. Sube el repo a GitHub e importalo en Vercel (`Framework: Next.js`, sin config extra).
2. En **Settings → Environment Variables** agrega `USER2_PIN` con el PIN privado del
   usuario 2 (sin esta variable nadie puede entrar como Enzo Editor) y, si quieres
   avisos, las del canal elegido (`RESEND_API_KEY` + `NOTIFY_EMAIL_TO`, o
   `WHATSAPP_PHONE` + `WHATSAPP_APIKEY`, o `NOTIFY_WEBHOOK_URL`).
3. Crea la base de datos: **Storage → Marketplace → Upstash Redis** y conectala al
   proyecto. Vercel inyecta `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`
   (tambien se aceptan `KV_REST_API_URL` / `KV_REST_API_TOKEN`).
4. Deploy. La insignia del pie debe decir **"Base compartida conectada"**: significa que
   los dos ven los mismos datos desde cualquier dispositivo.

> Sin base de datos la app funciona igual, pero en Vercel el disco es de solo lectura y
> los cambios viven solo en memoria (se pierden al reiniciar). El banner amarillo lo
> avisa dentro de la propia pagina.

## Avisos cuando un video queda listo

Cuando **Enzo Editor** pasa un video de *pendiente* a *listo*, **DaemonCS** recibe el
aviso con la pagina, la fecha, el titulo, el link y la miniatura del video. Detalles:

- Sale del servidor, en el mismo `PATCH /api/assignments`, pero **despues de responder**
  (`after()` de Next), asi que guardar nunca espera a Resend, CallMeBot o al webhook.
- Se dispara solo en la transicion *pendiente → listo*: reabrir un video o volver a
  confirmar algo que ya estaba verde no manda aviso repetido.
- Cada canal se activa solo con sus variables de entorno; sin ninguna, el aviso queda
  unicamente en los logs y la app funciona igual.

### Email (Resend)

1. Crea una cuenta en [resend.com](https://resend.com) y copia una **API Key**.
2. Configura `RESEND_API_KEY`, `NOTIFY_EMAIL_TO` y, si ya tienes dominio propio,
   `NOTIFY_EMAIL_FROM` (por defecto `onboarding@resend.dev`, que solo puede enviarle al
   email de la propia cuenta de Resend).
3. El correo lleva la miniatura del video, un resumen del dia y un boton al calendario.

### WhatsApp (CallMeBot)

Gratis para uso personal. Quien recibe el aviso debe hacerlo una sola vez:

1. Agrega el numero **+34 694 23 41 84** a sus contactos.
2. Enviale por WhatsApp el mensaje `I allow callmebot to send me messages`.
3. El bot responde con una apikey: guardala en `WHATSAPP_APIKEY` y pon tu numero
   (con codigo de pais) en `WHATSAPP_PHONE`.

### Webhook

Con `NOTIFY_WEBHOOK_URL` el servidor hace un `POST` con JSON a lo que pongas ahi: sirve
para Make, Zapier, n8n, un bot de Telegram/Discord o la WhatsApp Cloud API de Meta via
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
  "text": "Video subido en LLAVEDROP…"
}
```

### Comprobar que quedo bien

- `GET /api/notify` dice que canales estan activos (sin exponer credenciales).
- En la app, debajo del calendario, hay una fila con el estado de cada canal.
- Entrando como usuario 2 aparece el boton **Probar aviso**, que manda un aviso de
  prueba por todos los canales configurados (`POST /api/notify`).

## API

| Metodo | Ruta | Para que |
| --- | --- | --- |
| `POST` | `/api/session` | `{ pin }` → `{ token }` para entrar como usuario 2 (`GET` avisa si hay PIN configurado) |
| `GET` | `/api/notify` | Que canales de aviso estan configurados |
| `POST` | `/api/notify` | Manda un aviso de prueba (requiere el token del usuario 2) |
| `GET` | `/api/state` | Estado completo (paginas y videos) |
| `POST` | `/api/assignments` | Crear o editar el video de un dia: `{ date, pageId, title, url, notes, actor }` (como `user2` requiere la cabecera `x-user2-token`) |
| `PATCH` | `/api/assignments` | `{ id, status: "assigned" \| "ready", actor }` (como `user2` requiere la cabecera `x-user2-token`) |
| `DELETE` | `/api/assignments?id=` | Quitar un video del dia |
| `POST` | `/api/pages` | `{ name, accent }` |
| `DELETE` | `/api/pages?id=` | Borrar una pagina personalizada (y sus videos) |

## Scripts

```bash
npm run dev        # desarrollo
npm run build      # build de produccion
npm run start      # servidor de produccion
npm run typecheck  # tsc --noEmit
```
