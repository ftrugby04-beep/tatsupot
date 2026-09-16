import { useSyncExternalStore } from "react";
import { CoachingEntry } from "./coaching-types";

const STORAGE_KEY = "tatsupot:coachingEntries";
const CHANGE_EVENT = "tatsupot:coaching-changed";

function isBrowser() {
  return typeof window !== "undefined";
}

let cache: Record<string, CoachingEntry> | null = null;

function computeEntries(): Record<string, CoachingEntry> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, CoachingEntry>;
  } catch {
    return {};
  }
}

function invalidateCache() {
  cache = null;
}

function notifyChange() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function listEntries(): Record<string, CoachingEntry> {
  if (!isBrowser()) return {};
  if (cache === null) cache = computeEntries();
  return cache;
}

export function saveEntry(entry: CoachingEntry): void {
  if (!isBrowser()) return;
  const next = { ...listEntries(), [entry.date]: entry };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  invalidateCache();
  notifyChange();
}

export function deleteEntry(date: string): void {
  if (!isBrowser()) return;
  const next = { ...listEntries() };
  delete next[date];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  invalidateCache();
  notifyChange();
}

function subscribe(callback: () => void) {
  const handleStorage = () => {
    invalidateCache();
    callback();
  };
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", handleStorage);
  };
}

const EMPTY: Record<string, CoachingEntry> = {};

export function useCoachingEntries(): Record<string, CoachingEntry> {
  return useSyncExternalStore(subscribe, listEntries, () => EMPTY);
}
