/**
 * Storage layer — IndexedDB with two object stores:
 *   "kv"    key-value pairs for all structured app data (replaces localStorage shim)
 *   "blobs" binary data for future receipt/photo attachments
 *
 * On first open, migrates any existing data from localStorage so no user data is lost.
 */

const DB_NAME    = "builder-tracker";
const DB_VERSION = 1;
const LS_MIGRATED_KEY = "__bt_idb_migrated";

let _db = null;

function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("kv")) {
        db.createObjectStore("kv", { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains("blobs")) {
        db.createObjectStore("blobs", { keyPath: "id" });
      }
    };

    req.onsuccess = (e) => {
      _db = e.target.result;
      resolve(_db);
    };

    req.onerror = () => reject(req.error);
  });
}

// ─── Key-value store ──────────────────────────────────────────────────────────

export async function storageGet(key, fallback) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx  = db.transaction("kv", "readonly");
      const req = tx.objectStore("kv").get(key);
      req.onsuccess = () => {
        const row = req.result;
        resolve(row ? JSON.parse(row.value) : fallback);
      };
      req.onerror = () => resolve(fallback);
    });
  } catch {
    return fallback;
  }
}

export async function storageSet(key, value) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction("kv", "readwrite");
      tx.objectStore("kv").put({ key, value: JSON.stringify(value) });
      tx.oncomplete = () => resolve();
      tx.onerror    = () => resolve();
    });
  } catch {}
}

// ─── Blob store (receipts / photos) ──────────────────────────────────────────

export async function blobGet(id) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx  = db.transaction("blobs", "readonly");
      const req = tx.objectStore("blobs").get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror   = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function blobSet(id, blob, meta = {}) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction("blobs", "readwrite");
      tx.objectStore("blobs").put({ id, blob, meta, savedAt: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror    = () => resolve();
    });
  } catch {}
}

export async function blobDelete(id) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction("blobs", "readwrite");
      tx.objectStore("blobs").delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror    = () => resolve();
    });
  } catch {}
}

// ─── One-time migration from localStorage ────────────────────────────────────

const LS_KEYS = [
  "builder-entries",
  "builder-expenses",
  "builder-recurring",
  "builder-schedule",
  "builder-jobs",
  "builder-settings",
  "builder-active-jobs",
  "builder-client-profiles",
];

export async function migrateFromLocalStorage() {
  // Only run once
  if (localStorage.getItem(LS_MIGRATED_KEY)) return;

  let migrated = 0;
  for (const key of LS_KEYS) {
    const raw = localStorage.getItem(key);
    if (raw != null) {
      try {
        const value = JSON.parse(raw);
        await storageSet(key, value);
        migrated++;
      } catch {}
    }
  }

  localStorage.setItem(LS_MIGRATED_KEY, "1");
  if (migrated > 0) {
    console.info(`[storage] Migrated ${migrated} keys from localStorage → IndexedDB`);
  }
}
