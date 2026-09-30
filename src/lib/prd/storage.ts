import { openDB, type IDBPDatabase } from "idb";
import { DEFAULT_DRAFT, DEFAULT_SETTINGS } from "./constants";
import type { Draft, PrdRecord, Settings } from "./types";

const SETTINGS_KEY = "qwilr.settings";
const DRAFT_KEY = "qwilr.draft";
const DB_NAME = "qwilr";
const LEGACY_SETTINGS_KEY = "vibeprd.settings";
const LEGACY_DRAFT_KEY = "vibeprd.draft";
const LEGACY_DB_NAME = "vibeprd";
const STORE = "prds";

function migrateLocalKeys() {
  if (typeof window === "undefined") return;
  try {
    for (const [oldKey, newKey] of [
      [LEGACY_SETTINGS_KEY, SETTINGS_KEY],
      [LEGACY_DRAFT_KEY, DRAFT_KEY],
    ] as const) {
      const old = window.localStorage.getItem(oldKey);
      if (old !== null) {
        if (window.localStorage.getItem(newKey) === null) window.localStorage.setItem(newKey, old);
        window.localStorage.removeItem(oldKey);
      }
    }
  } catch {
    /* storage unavailable */
  }
}
migrateLocalKeys();

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

async function migrateLegacyDb(target: IDBPDatabase) {
  try {
    if (window.localStorage.getItem("qwilr.dbMigrated")) return;
    const dbs = indexedDB.databases ? await indexedDB.databases() : [{ name: LEGACY_DB_NAME }];
    if (dbs.some((d) => d.name === LEGACY_DB_NAME)) {
      const legacy = await openDB(LEGACY_DB_NAME);
      if (legacy.objectStoreNames.contains(STORE)) {
        const rows = (await legacy.getAll(STORE)) as PrdRecord[];
        for (const row of rows) {
          await target.put(STORE, { ...row, generator: { ...row.generator, app: "Qwilr" } });
        }
      }
      legacy.close();
    }
    window.localStorage.setItem("qwilr.dbMigrated", "1");
  } catch {
    /* migration best effort */
  }
}

let dbPromise: Promise<IDBPDatabase> | null = null;
function db() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const database = await openDB(DB_NAME, 1, {
        upgrade(d) {
          if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE, { keyPath: "id" });
        },
      });
      await migrateLegacyDb(database);
      return database;
    })();
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
