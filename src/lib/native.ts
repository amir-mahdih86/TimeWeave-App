import { invoke } from "@tauri-apps/api/core";

// True only when running inside a Tauri webview (Android APK or desktop shell).
export function isNative(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

// invoke that silently no-ops outside Tauri (pure web dev) and logs failures.
export async function safeInvoke<T>(
  cmd: string,
  args?: Record<string, unknown>
): Promise<T | null> {
  if (!isNative()) return null;
  try {
    return await invoke<T>(cmd, args);
  } catch (e) {
    console.warn(`[timeweave] ${cmd} failed:`, e);
    return null;
  }
}
