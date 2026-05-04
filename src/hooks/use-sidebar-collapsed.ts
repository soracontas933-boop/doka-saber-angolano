import { useSyncExternalStore } from "react";

const KEY = "delle-sidebar-collapsed";

const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function emit() {
  listeners.forEach((l) => l());
}

export function setSidebarCollapsed(value: boolean) {
  try {
    localStorage.setItem(KEY, value ? "1" : "0");
  } catch {
    /* ignore */
  }
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useSidebarCollapsed(): [boolean, (v: boolean) => void] {
  const value = useSyncExternalStore(subscribe, read, () => false);
  return [value, setSidebarCollapsed];
}
