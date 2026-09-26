import { promises as fs } from "node:fs";
import path from "node:path";
import { emptyState, STATE_VERSION } from "./presets";
import type { Assignment, CalendarState, PageItem, StorageKind } from "./types";

const REDIS_KEY = process.env.CALENDAR_REDIS_KEY ?? "videocal:state:v1";
const DATA_FILE = path.join(process.cwd(), ".data", "state.json");

let memoryCache: CalendarState | null = null;
let fileWritable = true;
let activeKind: StorageKind | null = null;

function redisConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return { url: url.replace(/\/$/, ""), token };
}

export function storageKind(): StorageKind {
  const cfg = redisConfig();
  if (cfg) return "redis";
  if (activeKind === "memory") return "memory";
  return fileWritable ? "file" : "memory";
}

async function redisCommand(args: (string | number)[]): Promise<unknown> {
  const cfg = redisConfig();
  if (!cfg) throw new Error("Redis no configurado");
  const response = await fetch(cfg.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Redis HTTP ${response.status}: ${await response.text()}`);
  }
  const payload = (await response.json()) as { result?: unknown; error?: string };
  if (payload.error) throw new Error(payload.error);
  return payload.result ?? null;
}

async function readRaw(): Promise<unknown> {
  const cfg = redisConfig();
  if (cfg) {
    const result = await redisCommand(["GET", REDIS_KEY]);
    if (typeof result !== "string" || result.length === 0) return null;
    return JSON.parse(result) as unknown;
  }
  try {
    const text = await fs.readFile(DATA_FILE, "utf8");
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

/** Une cualquier estado guardado con la forma actual (migraciones tolerantes). */
export function normalizeState(raw: unknown): CalendarState {
  const base = emptyState();
  if (!raw || typeof raw !== "object") return base;
  const input = raw as Partial<CalendarState>;

  const seenPageIds = new Set<string>();
  const pages: PageItem[] = [];
  for (const page of [...base.pages, ...(Array.isArray(input.pages) ? input.pages : [])]) {
    if (!page || typeof page.id !== "string" || seenPageIds.has(page.id)) continue;
    seenPageIds.add(page.id);
    pages.push({
      id: page.id,
      name: typeof page.name === "string" && page.name.trim() ? page.name.trim() : "Página",
      slug:
        typeof page.slug === "string" && page.slug.trim()
          ? page.slug
          : String(page.name ?? "").toUpperCase().slice(0, 18),
      accent: page.accent ?? "cyan",
      builtIn: Boolean(page.builtIn) || page.id === "page-ggdrop" || page.id === "page-llavedrop",
      createdAt: typeof page.createdAt === "string" ? page.createdAt : base.updatedAt,
    });
  }

  const assignments: Assignment[] = (Array.isArray(input.assignments) ? input.assignments : [])
    .filter(
      (item): item is Assignment =>
        Boolean(item) &&
        typeof item.id === "string" &&
        typeof item.date === "string" &&
        typeof item.pageId === "string" &&
        seenPageIds.has(item.pageId),
    )
    .map((item) => ({
      id: item.id,
      date: item.date,
      pageId: item.pageId,
      title: typeof item.title === "string" ? item.title : "",
      url: typeof item.url === "string" ? item.url : "",
      notes: typeof item.notes === "string" ? item.notes : "",
      status: item.status === "ready" ? "ready" : "assigned",
      createdBy: item.createdBy === "user2" ? "user2" : "user1",
      createdAt: typeof item.createdAt === "string" ? item.createdAt : base.updatedAt,
      updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : base.updatedAt,
      readyBy: item.readyBy === "user1" || item.readyBy === "user2" ? item.readyBy : null,
      readyAt: typeof item.readyAt === "string" ? item.readyAt : null,
    }));

  return {
    version: STATE_VERSION,
    pages,
    assignments,
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : base.updatedAt,
  };
}

export async function getState(): Promise<CalendarState> {
  try {
    const raw = await readRaw();
    const state = normalizeState(raw);
    memoryCache = state;
    activeKind = null;
    return state;
  } catch (error) {
    console.error("[store] lectura fallida, usando cache en memoria:", error);
    activeKind = "memory";
    return memoryCache ?? emptyState();
  }
}

export async function saveState(next: CalendarState): Promise<StorageKind> {
  memoryCache = next;
  const cfg = redisConfig();
  if (cfg) {
    await redisCommand(["SET", REDIS_KEY, JSON.stringify(next)]);
    activeKind = "redis";
    return "redis";
  }
  try {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(next, null, 2), "utf8");
    activeKind = "file";
    return "file";
  } catch (error) {
    console.error("[store] escritura en disco fallida, sigo en memoria:", error);
    fileWritable = false;
    activeKind = "memory";
    return "memory";
  }
}

/** Lee, aplica una mutacion pura y persiste. */
export async function mutateState(
  fn: (state: CalendarState) => CalendarState,
): Promise<CalendarState> {
  const current = await getState();
  const next = fn(current);
  const saved = await saveState(next);
  activeKind = saved;
  return next;
}
