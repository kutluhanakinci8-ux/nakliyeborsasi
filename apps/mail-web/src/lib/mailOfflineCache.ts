import {
  fetchInbox,
  fetchMessage,
  type MailInboxFolder,
  type MailInboxListItem,
  type MailInboxMessageDetail,
  type MailInboxSummary,
  type MailSendReadiness,
  type MailSentItem,
} from "./mailApi";

export const OFFLINE_DB_NAME = "lerta-mail-offline-v1";
export const OFFLINE_MAX_LIST = 50;
export const OFFLINE_MAX_DETAILS = 25;

const STORE_SNAPSHOTS = "inboxSnapshots";
const STORE_DETAILS = "messageDetails";

export type InboxSnapshotPayload = {
  summary: MailInboxSummary;
  sendReadiness?: MailSendReadiness;
  messages: MailInboxListItem[];
  sent: MailSentItem[];
  cachedAt: number;
};

type InboxSnapshotRecord = {
  key: string;
  payload: InboxSnapshotPayload;
};

type MessageDetailRecord = {
  id: string;
  message: MailInboxMessageDetail;
  cachedAt: number;
};

function openOfflineDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(OFFLINE_DB_NAME, 1);
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
): string {
  return `${folder}:${customFolderId ?? ""}`;
}

export async function putInboxSnapshot(
  key: string,
  payload: InboxSnapshotPayload,
): Promise<void> {
  if (typeof indexedDB === "undefined") {
    return;
  }
  const db = await openOfflineDb();
  const tx = db.transaction(STORE_SNAPSHOTS, "readwrite");
  await idbRequest(
    tx.objectStore(STORE_SNAPSHOTS).put({
      key,
      payload: {
        ...payload,
        messages: payload.messages.slice(0, OFFLINE_MAX_LIST),
      },
    } satisfies InboxSnapshotRecord),
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
  const row = await idbRequest<InboxSnapshotRecord | undefined>(
    tx.objectStore(STORE_SNAPSHOTS).get(key),
  );
  db.close();
  return row?.payload ?? null;
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
  const db = await openOfflineDb();
  await runTransaction(db, STORE_DETAILS, "readwrite", (store) => {
    store.put({
      id: message.id,
      message,
      cachedAt: Date.now(),
    } satisfies MessageDetailRecord);
  });
  const all = await (async () => {
    const tx = db.transaction(STORE_DETAILS, "readonly");
    return idbRequest<MessageDetailRecord[]>(
      tx.objectStore(STORE_DETAILS).getAll(),
    );
  })();
  if (all.length > OFFLINE_MAX_DETAILS) {
    const sorted = [...all].sort((a, b) => b.cachedAt - a.cachedAt);
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
  const row = await idbRequest<MessageDetailRecord | undefined>(
    tx.objectStore(STORE_DETAILS).get(id),
  );
  db.close();
  return row?.message ?? null;
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
): Promise<{
  summary: MailInboxSummary;
  sendReadiness?: MailSendReadiness;
  messages: MailInboxListItem[];
  sent: MailSentItem[];
  fromOfflineCache: boolean;
  cachedAt: number | null;
}> {
  const key = inboxCacheKey(folder, customFolderId);
  try {
    const data = await fetchInbox(accessToken, folder, customFolderId);
    await putInboxSnapshot(key, {
      summary: data.summary,
      sendReadiness: data.sendReadiness,
      messages: data.messages,
      sent: data.sent,
      cachedAt: Date.now(),
    });
    return {
      ...data,
      fromOfflineCache: false,
      cachedAt: null,
    };
  } catch (error) {
    if (!isLikelyNetworkFailure(error)) {
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
      fromOfflineCache: true,
      cachedAt: cached.cachedAt,
    };
  }
}

export async function fetchMessageWithOfflineCache(
  accessToken: string,
  id: string,
): Promise<{ message: MailInboxMessageDetail; fromOfflineCache: boolean }> {
  try {
    const message = await fetchMessage(accessToken, id);
    await putMessageDetail(message);
    return { message, fromOfflineCache: false };
  } catch (error) {
    if (!isLikelyNetworkFailure(error)) {
      throw error;
    }
    const cached = await getMessageDetail(id);
    if (!cached) {
      throw error;
    }
    return { message: cached, fromOfflineCache: true };
  }
}
