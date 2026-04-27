const DB_NAME = "colabo-frontend-cache";
const DB_VERSION = 1;
const STORE_NAME = "snapshots";
const MAX_AGE_MS = 1000 * 60 * 60 * 24;

type SnapshotRecord<T> = {
    key: string;
    value: T;
    updatedAt: number;
};

function canUseIndexedDB() {
    return typeof window !== "undefined" && "indexedDB" in window;
}

function openSnapshotDb(): Promise<IDBDatabase | null> {
    if (!canUseIndexedDB()) {
        return Promise.resolve(null);
    }

    return new Promise((resolve) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: "key" });
            }
        };

        request.onerror = () => resolve(null);
        request.onsuccess = () => resolve(request.result);
    });
}

export async function readSnapshot<T>(key: string): Promise<T | null> {
    const db = await openSnapshotDb();
    if (!db) {
        return null;
    }

    return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const request = tx.objectStore(STORE_NAME).get(key);

        request.onerror = () => resolve(null);
        request.onsuccess = () => {
            const record = request.result as SnapshotRecord<T> | undefined;
            if (!record || Date.now() - record.updatedAt > MAX_AGE_MS) {
                resolve(null);
                return;
            }

            resolve(record.value);
        };

        tx.oncomplete = () => db.close();
        tx.onerror = () => db.close();
    });
}

export async function writeSnapshot<T>(key: string, value: T): Promise<void> {
    const db = await openSnapshotDb();
    if (!db) {
        return;
    }

    return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).put({
            key,
            value,
            updatedAt: Date.now(),
        } satisfies SnapshotRecord<T>);

        tx.oncomplete = () => {
            db.close();
            resolve();
        };
        tx.onerror = () => {
            db.close();
            resolve();
        };
    });
}
