import { useSyncExternalStore } from "react";
import { Meeting } from "./types";

const STORAGE_KEY = "tatsupot:meetings";
const SLACK_KEY = "tatsupot:slackWebhookUrl";
const CHANGE_EVENT = "tatsupot:meetings-changed";

function isBrowser() {
  return typeof window !== "undefined";
}

let meetingsCache: Meeting[] | null = null;

function computeMeetings(): Meeting[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Meeting[];
    return parsed.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch {
    return [];
  }
}

function invalidateCache() {
  meetingsCache = null;
}

function notifyChange() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function listMeetings(): Meeting[] {
  if (!isBrowser()) return [];
  if (meetingsCache === null) meetingsCache = computeMeetings();
  return meetingsCache;
}

export function getMeeting(id: string): Meeting | null {
  return listMeetings().find((m) => m.id === id) ?? null;
}

export function saveMeeting(meeting: Meeting): void {
  if (!isBrowser()) return;
  const meetings = listMeetings();
  const idx = meetings.findIndex((m) => m.id === meeting.id);
  const next = idx >= 0 ? meetings.map((m, i) => (i === idx ? meeting : m)) : [...meetings, meeting];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  invalidateCache();
  notifyChange();
}

export function deleteMeeting(id: string): void {
  if (!isBrowser()) return;
  const meetings = listMeetings().filter((m) => m.id !== id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(meetings));
  invalidateCache();
  notifyChange();
}

export function createMeetingId(): string {
  return crypto.randomUUID();
}

export function getSavedSlackWebhookUrl(): string {
  if (!isBrowser()) return "";
  return window.localStorage.getItem(SLACK_KEY) ?? "";
}

export function saveSlackWebhookUrl(url: string): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(SLACK_KEY, url);
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

const EMPTY_MEETINGS: Meeting[] = [];

export function useMeetings(): Meeting[] {
  return useSyncExternalStore(subscribe, listMeetings, () => EMPTY_MEETINGS);
}

export function useMeeting(id: string): Meeting | null {
  return useSyncExternalStore(
    subscribe,
    () => getMeeting(id),
    () => null
  );
}
