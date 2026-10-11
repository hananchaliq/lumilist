/**
 * IndexedDB storage for persistent audio uploads
 * Ensures uploaded songs are never lost across browser refresh / reloads.
 */

const DB_NAME = 'lumilist_music_db';
const STORE_NAME = 'uploaded_tracks';
const DB_VERSION = 1;

export interface StoredAudioTrack {
  id: string;
  title: string;
  artist: string;
  duration: number;
  blob: Blob;
  mimeType: string;
  uploadedAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveTrackToIndexedDB(track: {
  id: string;
  title: string;
  artist: string;
  duration: number;
  file: File | Blob;
}): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      const record: StoredAudioTrack = {
        id: track.id,
        title: track.title,
        artist: track.artist,
        duration: track.duration || 180,
        blob: track.file,
        mimeType: track.file.type || 'audio/mpeg',
        uploadedAt: Date.now(),
      };

      const putReq = store.put(record);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
      tx.oncomplete = () => db.close();
    });
  } catch (err) {
    console.warn('Failed to save audio track to IndexedDB:', err);
  }
}

export async function getAllTracksFromIndexedDB(): Promise<StoredAudioTrack[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        db.close();
        resolve(req.result || []);
      };
      req.onerror = () => {
        db.close();
        resolve([]);
      };
    });
  } catch {
    return [];
  }
}

export async function deleteTrackFromIndexedDB(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      tx.oncomplete = () => db.close();
    });
  } catch {
    // ignore
  }
}

export async function clearAllTracksFromIndexedDB(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      tx.oncomplete = () => db.close();
    });
  } catch {
    // ignore
  }
}
