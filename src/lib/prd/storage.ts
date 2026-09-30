import { openDB, type IDBPDatabase } from "idb";
import { DEFAULT_DRAFT, DEFAULT_SETTINGS } from "./constants";
import type { Draft, PrdRecord, Settings } from "./types";

const SETTINGS_KEY = "vibeprd.settings";
const DRAFT_KEY = "vibeprd.draft";
const DB_NAME = "vibeprd";
const STORE = "prds";

export function loadSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings) {
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function loadDraft(): Draft {
  if (typeof window === "undefined") return DEFAULT_DRAFT;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return DEFAULT_DRAFT;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_DRAFT, ...parsed, colors: { ...DEFAULT_DRAFT.colors, ...parsed?.colors } };
  } catch {
    return DEFAULT_DRAFT;
  }
}

export function saveDraft(draft: Draft) {
  window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function clearDraft() {
  window.localStorage.removeItem(DRAFT_KEY);
}

let dbPromise: Promise<IDBPDatabase> | null = null;
function db() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(database) {
        if (!database.objectStoreNames.contains(STORE)) {
          database.createObjectStore(STORE, { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

export async function listPrds(): Promise<PrdRecord[]> {
  const all = (await (await db()).getAll(STORE)) as PrdRecord[];
  return all.sort((a, b) => (a.generatedAt < b.generatedAt ? 1 : -1));
}

export async function getPrd(id: string): Promise<PrdRecord | undefined> {
  return (await (await db()).get(STORE, id)) as PrdRecord | undefined;
}

export async function putPrd(record: PrdRecord) {
  await (await db()).put(STORE, record);
}

export async function deletePrd(id: string) {
  await (await db()).delete(STORE, id);
}

export async function clearAllLocalData() {
  window.localStorage.removeItem(SETTINGS_KEY);
  window.localStorage.removeItem(DRAFT_KEY);
  const database = await db();
  await database.clear(STORE);
}
