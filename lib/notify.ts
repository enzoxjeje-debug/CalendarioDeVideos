import { fromKey, formatLongDate } from "./dates";
import { parseVideoUrl } from "./video";

/**
 * Avisos al usuario 1 cuando el usuario 2 marca un video como listo.
 *
 * Todo sale del servidor y cada canal se activa solo si están sus variables de
 * entorno: sin configuración no se envía nada y la app sigue funcionando igual.
 *  - Email:    RESEND_API_KEY + NOTIFY_EMAIL_TO (+ NOTIFY_EMAIL_FROM)
 *  - WhatsApp: WHATSAPP_PHONE + WHATSAPP_APIKEY  (CallMeBot, gratis para uso personal)
 *  - Webhook:  NOTIFY_WEBHOOK_URL  (Zapier/Make/n8n/Telegram/Discord/WhatsApp Cloud API)
 */

export type NotifyChannel = "email" | "whatsapp" | "webhook" | "console";

export type NotifyResult = {
  channel: NotifyChannel;
  ok: boolean;
  detail: string;
};

export type VideoReadyEvent = {
  date: string;
  pageName: string;
  title: string;
  url: string;
  totalForDay: number;
  readyForDay: number;
  assignedBy: string;
  confirmedBy: string;
  test?: boolean;
};

function emailTarget(): { apiKey: string; from: string; to: string } | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const to = process.env.NOTIFY_EMAIL_TO?.trim();
  if (!apiKey || !to) return null;
  return {
    apiKey,
    from: process.env.NOTIFY_EMAIL_FROM?.trim() || "VideoCal <onboarding@resend.dev>",
    to,
  };
}

function whatsappTarget(): { phone: string; apiKey: string } | null {
  const phone = process.env.WHATSAPP_PHONE?.trim();
  const apiKey = process.env.WHATSAPP_APIKEY?.trim();
  if (!phone || !apiKey) return null;
  return { phone, apiKey };
}

function webhookTarget(): string | null {
  const url = process.env.NOTIFY_WEBHOOK_URL?.trim();
  return url ? url : null;
}

export function notifyChannels(): Record<Exclude<NotifyChannel, "console">, boolean> {
  return {
    email: emailTarget() !== null,
    whatsapp: whatsappTarget() !== null,
    webhook: webhookTarget() !== null,
  };
}

export function isNotifyConfigured(): boolean {
  return Object.values(notifyChannels()).some(Boolean);
}

function appUrl(): string {
  const explicit = process.env.NOTIFY_BASE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "")}`;
  return "http://localhost:3000";
}

const TIMEOUT_MS = 8000;

async function post(
  url: string,
  init: RequestInit,
): Promise<{ ok: boolean; detail: string }> {
  try {
    const response = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
    const text = await response.text().catch(() => "");
    if (!response.ok) {
      return { ok: false, detail: `HTTP ${response.status}${text ? `: ${text.slice(0, 160)}` : ""}` };
    }
    return { ok: true, detail: "enviado" };
  } catch (error) {
    return { ok: false, detail: error instanceof Error ? error.message : "error de red" };
  }
}

function plainText(event: VideoReadyEvent, link: string): string {
  const prefix = event.test ? "[PRUEBA] " : "";
  const pending = event.totalForDay - event.readyForDay;
  const rest =
    pending > 0
      ? `\nQuedan ${pending} video(s) pendientes ese día.`
      : "\nEse día queda completo en verde.";
  return [
    `${prefix}Video publicado en ${event.pageName}`,
    `Fecha: ${formatLongDate(fromKey(event.date))}`,
    `Video: ${event.title || "sin título"}`,
    event.url ? `Enlace: ${event.url}` : "Sin enlace todavía",
    `Confirmado por: ${event.confirmedBy}`,
    rest.trim(),
    link,
  ].join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function emailHtml(event: VideoReadyEvent, link: string): string {
  const thumbnail = event.url ? parseVideoUrl(event.url).thumbnail : null;
  const pending = event.totalForDay - event.readyForDay;
  const row = (label: string, value: string) =>
    `<tr><td style="padding:2px 12px 2px 0;color:#6f7796;font-size:13px">${label}</td>` +
    `<td style="padding:2px 0;color:#f5f7ff;font-size:13px;font-weight:600">${escapeHtml(value)}</td></tr>`;

  return `<!doctype html>
<html lang="es"><body style="margin:0;background:#05060d;font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif">
  <div style="max-width:520px;margin:0 auto;padding:28px 20px">
    <p style="margin:0 0 6px;color:#22d97f;font-size:12px;letter-spacing:.14em;text-transform:uppercase;font-weight:700">
      ${event.test ? "Prueba de aviso" : "Video publicado"}
    </p>
    <h1 style="margin:0 0 4px;color:#ffffff;font-size:22px;line-height:1.25">
      ${escapeHtml(event.pageName)} · ${escapeHtml(event.title || "Video sin título")}
    </h1>
    <p style="margin:0 0 18px;color:#9aa2c0;font-size:14px">
      ${escapeHtml(formatLongDate(fromKey(event.date)))}
    </p>
    ${
      thumbnail
        ? `<a href="${escapeHtml(event.url || link)}" style="text-decoration:none">
            <img src="${escapeHtml(thumbnail)}" alt="Miniatura del video" width="320"
                 style="display:block;width:100%;max-width:320px;border-radius:14px;border:1px solid #232840" />
          </a>`
        : ""
    }
    <table style="border-collapse:collapse;margin:18px 0 20px;width:100%">
      ${row("Página", event.pageName)}
      ${row("Confirmó", event.confirmedBy)}
      ${row("Asignado por", event.assignedBy)}
      ${row(
        "Estado del día",
        pending > 0 ? `${event.readyForDay} listos · ${pending} pendientes` : "Todo listo en verde",
      )}
    </table>
    ${
      event.url
        ? `<p style="margin:0 0 22px;font-size:13px"><a href="${escapeHtml(event.url)}" style="color:#a78bfa">${escapeHtml(event.url)}</a></p>`
        : ""
    }
    <a href="${escapeHtml(link)}" style="display:inline-block;background:#8b5cf6;color:#ffffff;text-decoration:none;
       font-size:14px;font-weight:600;padding:12px 20px;border-radius:999px">Abrir el calendario</a>
    <p style="margin:26px 0 0;color:#4c5473;font-size:11px">
      Aviso automático de VideoCal · puedes desactivarlo quitando las variables de entorno.
    </p>
  </div>
</body></html>`;
}

export async function notifyVideoReady(event: VideoReadyEvent): Promise<NotifyResult[]> {
  const results: NotifyResult[] = [];
  const link = appUrl();
  const subject = `${event.test ? "[Prueba] " : ""}Video publicado: ${event.title || event.pageName} (${event.pageName})`;
  const text = plainText(event, link);
  const config = notifyChannels();

  const email = emailTarget();
  if (email) {
    const response = await post("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${email.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: email.from,
        to: [email.to],
        subject,
        text,
        html: emailHtml(event, link),
      }),
    });
    results.push({ channel: "email", ok: response.ok, detail: response.detail });
  }

  const whatsapp = whatsappTarget();
  if (whatsapp) {
    const message = `${event.test ? "🧪 Prueba de aviso" : "✅ *Video publicado*"}\n` +
      `*${event.pageName}* · ${formatLongDate(fromKey(event.date))}\n` +
      `🎬 ${event.title || "Sin título"}\n` +
      (event.url ? `🔗 ${event.url}\n` : "") +
      `Confirmado por ${event.confirmedBy}\n${link}`;
    const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(whatsapp.phone)}&text=${encodeURIComponent(message)}&apikey=${encodeURIComponent(whatsapp.apiKey)}`;
    const response = await post(url, { method: "GET" });
    results.push({ channel: "whatsapp", ok: response.ok, detail: response.detail });
  }

  const webhook = webhookTarget();
  if (webhook) {
    const response = await post(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "video-ready",
        page: event.pageName,
        date: event.date,
        title: event.title,
        url: event.url,
        thumbnail: event.url ? parseVideoUrl(event.url).thumbnail : null,
        confirmedBy: event.confirmedBy,
        assignedBy: event.assignedBy,
        readyForDay: event.readyForDay,
        totalForDay: event.totalForDay,
        dayComplete: event.readyForDay >= event.totalForDay,
        test: event.test === true,
        calendarUrl: link,
        text,
      }),
    });
    results.push({ channel: "webhook", ok: response.ok, detail: response.detail });
  }

  if (!config.email && !config.whatsapp && !config.webhook) {
    // Sin canales configurados solo queda el registro en los logs.
    console.info("[notify] sin canales configurados, aviso omitido:", text);
    results.push({
      channel: "console",
      ok: true,
      detail: "sin canales configurados: consulta .env.example",
    });
  }

  for (const result of results) {
    if (!result.ok) {
      console.error(`[notify] fallo el canal ${result.channel}: ${result.detail}`);
    }
  }

  return results;
}