import * as SQLite from 'expo-sqlite';
import type { Book } from './api';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('library.db');
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS saved_books (
          id INTEGER PRIMARY KEY NOT NULL,
          title TEXT NOT NULL,
          authors TEXT NOT NULL,
          languages TEXT NOT NULL,
          subjects TEXT NOT NULL,
          bookshelves TEXT NOT NULL,
          download_count INTEGER NOT NULL,
          cover_url TEXT,
          formats TEXT NOT NULL,
          saved_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS browse_cache (
          key TEXT PRIMARY KEY NOT NULL,
          books TEXT NOT NULL,
          has_more INTEGER NOT NULL,
          fetched_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY NOT NULL, v TEXT NOT NULL);
      `);
      return db;
    })();
  }
  return dbPromise;
}

const fromRow = (r: any): Book => ({
  id: r.id,
  title: r.title,
  authors: JSON.parse(r.authors),
  languages: JSON.parse(r.languages),
  subjects: JSON.parse(r.subjects),
  bookshelves: JSON.parse(r.bookshelves),
  downloadCount: r.download_count,
  coverUrl: r.cover_url,
  formats: JSON.parse(r.formats),
});

// ---- Saved library ----
export async function saveBook(b: Book) {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO saved_books
     (id,title,authors,languages,subjects,bookshelves,download_count,cover_url,formats,saved_at)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    b.id, b.title, JSON.stringify(b.authors), JSON.stringify(b.languages),
    JSON.stringify(b.subjects), JSON.stringify(b.bookshelves), b.downloadCount,
    b.coverUrl, JSON.stringify(b.formats), Date.now()
  );
}
export async function removeBook(id: number) {
  const db = await getDb();
  await db.runAsync('DELETE FROM saved_books WHERE id = ?', id);
}
export async function getSaved(id: number): Promise<Book | null> {
  const db = await getDb();
  const r = await db.getFirstAsync('SELECT * FROM saved_books WHERE id = ?', id);
  return r ? fromRow(r) : null;
}
export async function listSaved(): Promise<Book[]> {
  const db = await getDb();
  return (await db.getAllAsync('SELECT * FROM saved_books ORDER BY saved_at DESC')).map(fromRow);
}

// ---- Browse cache: first page per filter combination only ----
export const cacheKey = (lang: string | null, topic: string | null) => `${lang ?? 'all'}|${topic ?? 'all'}`;

export async function getCache(key: string) {
  const db = await getDb();
  const r: any = await db.getFirstAsync('SELECT * FROM browse_cache WHERE key = ?', key);
  return r ? { books: JSON.parse(r.books) as Book[], hasMore: !!r.has_more, fetchedAt: r.fetched_at as number } : null;
}
export async function putCache(key: string, books: Book[], hasMore: boolean) {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO browse_cache (key,books,has_more,fetched_at) VALUES (?,?,?,?)',
    key, JSON.stringify(books), hasMore ? 1 : 0, Date.now()
  );
  // keep at most 12 filter combos
  await db.runAsync(
    'DELETE FROM browse_cache WHERE key NOT IN (SELECT key FROM browse_cache ORDER BY fetched_at DESC LIMIT 12)'
  );
}

// ---- Tiny key/value store (last-used filters) ----
export async function getKv(k: string) {
  const db = await getDb();
  const r: any = await db.getFirstAsync('SELECT v FROM kv WHERE k = ?', k);
  return r ? (r.v as string) : null;
}
export async function setKv(k: string, v: string) {
  const db = await getDb();
  await db.runAsync('INSERT OR REPLACE INTO kv (k,v) VALUES (?,?)', k, v);
}
