import { ALL_SPELLS } from './core.js';
export const BOOK_KEY = 'camera-game-lab-hand-spell-book-v1';
export function readBook(storage) {
  try { const raw = JSON.parse((storage ?? globalThis.localStorage).getItem(BOOK_KEY) ?? '[]'); return Array.isArray(raw) ? [...new Set(raw)].filter(id => ALL_SPELLS.some(s => s.id === id)) : []; } catch { return []; }
}
export function discover(id, storage) {
  const before = readBook(storage); if (!ALL_SPELLS.some(s => s.id === id)) return { book: before, isNew: false };
  const isNew = !before.includes(id), book = isNew ? [...before, id] : before;
  try { (storage ?? globalThis.localStorage).setItem(BOOK_KEY, JSON.stringify(book)); } catch {}
  return { book, isNew };
}
