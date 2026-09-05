// localStorage-backed in-memory store. Acts as the Phase 1 "database".
// To connect a real backend later, replace the functions in the service
// modules (authService, resourceService, queueService, notificationService)
// with REST calls — UI components import only those service functions,
// never this store directly.

import { seedData } from "./mockData";

const DB_KEY = "medisync_db_v1";
const SESSION_KEY = "medisync_session_v1";

let db = null;
const listeners = new Set();

function init() {
  if (db) return db;
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      db = JSON.parse(raw);
    } else {
      db = seedData();
      persist();
    }
  } catch {
    db = seedData();
    persist();
  }
  return db;
}

function persist() {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch {
    /* ignore quota errors */
  }
  listeners.forEach((cb) => cb());
}

export function resetDb() {
  db = seedData();
  persist();
}

export function getDb() {
  return init();
}

export function subscribe(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// Generic collection helpers
export function all(collection) {
  return init()[collection] ?? [];
}

export function findMany(collection, predicate) {
  return all(collection).filter(predicate);
}

export function findOne(collection, predicate) {
  return all(collection).find(predicate);
}

export function getById(collection, id) {
  return all(collection).find((r) => r.id === id);
}

export function insert(collection, record) {
  init()[collection].push(record);
  persist();
  return record;
}

export function updateById(collection, id, patch) {
  const list = init()[collection];
  const idx = list.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...patch };
  persist();
  return list[idx];
}

export function removeById(collection, id) {
  const list = init()[collection];
  const idx = list.findIndex((r) => r.id === id);
  if (idx === -1) return false;
  list.splice(idx, 1);
  persist();
  return true;
}

export function nextCounter(hospitalId) {
  const counters = init().counters;
  counters[hospitalId] = (counters[hospitalId] ?? 0) + 1;
  persist();
  return counters[hospitalId];
}

// Session (mock auth) — stored separately so it survives db resets only when intended.
export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSession(session) {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(SESSION_KEY);
}