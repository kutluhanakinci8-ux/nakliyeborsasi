import {
  fetchInbox,
  fetchMessage,
  isMailSessionExpiredError,
  type MailInboxFolder,
  type MailInboxListItem,
  type MailInboxMessageDetail,
  type MailConnectedAccountRow,
  type MailInboxSummary,
  type MailSendReadiness,
  type MailSentItem,
} from "./mailApi";
import {
  decodeOfflineMessageDetail,
  decodeOfflineSnapshot,
  encodeOfflineMessageDetail,
  encodeOfflineSnapshot,
} from "./mailOfflineZstd";

export const OFFLINE_DB_NAME = "lerta-mail-offline-v1";
export const OFFLINE_DB_VERSION = 2;
export const OFFLINE_MAX_LIST = 50;
export const OFFLINE_MAX_DETAILS = 25;

const STORE_SNAPSHOTS = "inboxSnapshots";
const STORE_DETAILS = "messageDetails";

import type { InboxSnapshotPayload } from "./mailOfflineTypes";

export type { InboxSnapshotPayload } from "./mailOfflineTypes";

type InboxSnapshotRecordLegacy = {
  key: string;
  payload: InboxSnapshotPayload;
};

type InboxSnapshotRecordCompressed = {
  key: string;
  codec: string;
  blob: string;
  cachedAt: number;
};

type MessageDetailRecordLegacy = {
  id: string;
  message: MailInboxMessageDetail;
  cachedAt: number;
};

type MessageDetailRecordCompressed = {
  id: string;
  codec: string;
  blob: string;
  cachedAt: number;
};

function openOfflineDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB açılamadı"));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_SNAPSHOTS)) {
        db.createObjectStore(STORE_SNAPSHOTS, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(STORE_DETAILS)) {
        db.createObjectStore(STORE_DETAILS, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function idbRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB işlemi başarısız"));
  });
}

export function inboxCacheKey(
  folder: MailInboxFolder,
  customFolderId?: string | null,
  connectedSource?: string | null,
): string {
  return `${folder}:${customFolderId ?? ""}:${connectedSource ?? "all"}`;
}

export async function putInboxSnapshot(
  key: string,
  payload: InboxSnapshotPayload,
): Promise<void> {
  if (typeof indexedDB === "undefined") {
    return;
  }
  const trimmed: InboxSnapshotPayload = {
    ...payload,
    messages: payload.messages.slice(0, OFFLINE_MAX_LIST),
  };
  const encoded = await encodeOfflineSnapshot(trimmed);
  const db = await openOfflineDb();
  const tx = db.transaction(STORE_SNAPSHOTS, "readwrite");
  await idbRequest(
    tx.objectStore(STORE_SNAPSHOTS).put({
      key,
      codec: encoded.codec,
      blob: encoded.blob,
      cachedAt: trimmed.cachedAt,
    } satisfies InboxSnapshotRecordCompressed),
  );
  db.close();
  postOfflineSyncToServiceWorker(key);
}

export async function getInboxSnapshot(
  key: string,
): Promise<InboxSnapshotPayload | null> {
  if (typeof indexedDB === "undefined") {
    return null;
  }
  const db = await openOfflineDb();
  const tx = db.transaction(STORE_SNAPSHOTS, "readonly");
  const row = await idbRequest<
    InboxSnapshotRecordCompressed | InboxSnapshotRecordLegacy | undefined
  >(tx.objectStore(STORE_SNAPSHOTS).get(key));
  db.close();
  if (!row) {
    return null;
  }
  if ("blob" in row && row.blob) {
    return decodeOfflineSnapshot(row.blob);
  }
  if ("payload" in row && row.payload) {
    return row.payload;
  }
  return null;
}

function runTransaction(
  db: IDBDatabase,
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
    fn(tx.objectStore(storeName));
  });
}

export async function putMessageDetail(
  message: MailInboxMessageDetail,
): Promise<void> {
  if (typeof indexedDB === "undefined") {
    return;
  }
  const encoded = await encodeOfflineMessageDetail(message, Date.now());
  const db = await openOfflineDb();
  await runTransaction(db, STORE_DETAILS, "readwrite", (store) => {
    store.put({
      id: encoded.id,
      codec: encoded.codec,
      blob: encoded.blob,
      cachedAt: encoded.cachedAt,
    } satisfies MessageDetailRecordCompressed);
  });
  const all = await (async () => {
    const tx = db.transaction(STORE_DETAILS, "readonly");
    return idbRequest<
      (MessageDetailRecordCompressed | MessageDetailRecordLegacy)[]
    >(tx.objectStore(STORE_DETAILS).getAll());
  })();
  if (all.length > OFFLINE_MAX_DETAILS) {
    const sorted = [...all].sort(
      (a, b) =>
        (b.cachedAt ?? 0) - (a.cachedAt ?? 0),
    );
    await runTransaction(db, STORE_DETAILS, "readwrite", (store) => {
      for (const stale of sorted.slice(OFFLINE_MAX_DETAILS)) {
        store.delete(stale.id);
      }
    });
  }
  db.close();
}

export async function getMessageDetail(
  id: string,
): Promise<MailInboxMessageDetail | null> {
  if (typeof indexedDB === "undefined") {
    return null;
  }
  const db = await openOfflineDb();
  const tx = db.transaction(STORE_DETAILS, "readonly");
  const row = await idbRequest<
    MessageDetailRecordCompressed | MessageDetailRecordLegacy | undefined
  >(tx.objectStore(STORE_DETAILS).get(id));
  db.close();
  if (!row) {
    return null;
  }
  if ("blob" in row && row.blob) {
    return decodeOfflineMessageDetail(row.blob).message;
  }
  if ("message" in row && row.message) {
    return row.message;
  }
  return null;
}

export function isLikelyNetworkFailure(error: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return true;
  }
  if (error instanceof TypeError) {
    return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  return /failed to fetch|network|load failed/i.test(message);
}

function shouldUseOfflineCacheFallback(error: unknown): boolean {
  return isLikelyNetworkFailure(error) || isMailSessionExpiredError(error);
}

function postOfflineSyncToServiceWorker(snapshotKey: string): void {
  if (typeof navigator === "undefined" || !navigator.serviceWorker?.controller) {
    return;
  }
  navigator.serviceWorker.controller.postMessage({
    type: "lerta-mail-offline-snapshot",
    key: snapshotKey,
    cachedAt: Date.now(),
  });
}

export async function fetchInboxWithOfflineCache(
  accessToken: string,
  folder: MailInboxFolder,
  customFolderId?: string | null,
  connectedSource?: import("./mailApi").MailConnectedInboxSource,
): Promise<{
  summary: MailInboxSummary;
  sendReadiness?: MailSendReadiness;
  messages: MailInboxListItem[];
  sent: MailSentItem[];
  connectedAccounts?: MailConnectedAccountRow[];
  fromOfflineCache: boolean;
  cachedAt: number | null;
  sessionStale: boolean;
}> {
  const key = inboxCacheKey(folder, customFolderId, connectedSource ?? "all");
  try {
    const data = await fetchInbox(
      accessToken,
      folder,
      customFolderId,
      connectedSource,
    );
    await putInboxSnapshot(key, {
      summary: data.summary,
      sendReadiness: data.sendReadiness,
      messages: data.messages,
      sent: data.sent,
      connectedAccounts: data.connectedAccounts,
      cachedAt: Date.now(),
    });
    return {
      ...data,
      fromOfflineCache: false,
      cachedAt: null,
      sessionStale: false,
    };
  } catch (error) {
    if (!shouldUseOfflineCacheFallback(error)) {
      throw error;
    }
    const cached = await getInboxSnapshot(key);
    if (!cached) {
      throw error;
    }
    return {
      summary: cached.summary,
      sendReadiness: cached.sendReadiness,
      messages: cached.messages,
      sent: cached.sent,
      connectedAccounts: cached.connectedAccounts,
      fromOfflineCache: true,
      cachedAt: cached.cachedAt,
      sessionStale: isMailSessionExpiredError(error),
    };
  }
}

export async function fetchMessageWithOfflineCache(
  accessToken: string,
  id: string,
): Promise<{
  message: MailInboxMessageDetail;
  fromOfflineCache: boolean;
  sessionStale: boolean;
}> {
  try {
    const message = await fetchMessage(accessToken, id);
    await putMessageDetail(message);
    return { message, fromOfflineCache: false, sessionStale: false };
  } catch (error) {
    if (!shouldUseOfflineCacheFallback(error)) {
      throw error;
    }
    const cached = await getMessageDetail(id);
    if (!cached) {
      throw error;
    }
    return {
      message: cached,
      fromOfflineCache: true,
      sessionStale: isMailSessionExpiredError(error),
    };
  }
}
