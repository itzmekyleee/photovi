// IndexedDB-backed strip gallery.

const DB_NAME = 'photovi';
const STORE = 'strips';

let dbPromise = null;

function open() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function req(tx, fn) {
  return new Promise((resolve, reject) => {
    const r = fn(tx.objectStore(STORE));
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

export async function saveStrip(record) {
  const db = await open();
  const tx = db.transaction(STORE, 'readwrite');
  const key = await req(tx, (s) => s.add(record));
  return key != null ? { ...record, id: key } : record;
}

export async function putStrip(record) {
  const db = await open();
  const tx = db.transaction(STORE, 'readwrite');
  await req(tx, (s) => s.put(record));
  return record;
}

export async function listStrips() {
  const db = await open();
  const tx = db.transaction(STORE, 'readonly');
  const all = await req(tx, (s) => s.getAll());
  return all.sort((a, b) => (b.ts || 0) - (a.ts || 0));
}

export async function getStrip(id) {
  const db = await open();
  const tx = db.transaction(STORE, 'readonly');
  return req(tx, (s) => s.get(id));
}

export async function deleteStrip(id) {
  const db = await open();
  const tx = db.transaction(STORE, 'readwrite');
  await req(tx, (s) => s.delete(id));
}

export function dataURLtoBlob(dataURL) {
  const [head, b64] = dataURL.split(',');
  const mime = head.match(/:(.*?);/)[1];
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return new Blob([u8], { type: mime });
}

export async function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(blob);
  });
}