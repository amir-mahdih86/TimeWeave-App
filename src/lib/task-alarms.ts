import { getSettings, type AppSettings } from "@/lib/settings";
import { isNative, safeInvoke } from "@/lib/native";
import { getTasksForDate } from "@/lib/storage";
import { Task } from "@/lib/schema";
import { format, addDays, startOfDay } from "date-fns";

// How many days ahead to keep alarms scheduled for fixed tasks.
const SYNC_DAYS = 7;

function taskStartMillis(task: Task, date: string): number | null {
  if (!task.startTime) return null;
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = task.startTime.split(":").map(Number);
  if ([y, m, d, hh, mm].some(n => Number.isNaN(n))) return null;
  return new Date(y, m - 1, d, hh, mm, 0, 0).getTime();
}

function alarmBody(task: Task): string {
  if (task.description && task.description.trim().length > 0) {
    const trimmed = task.description.trim();
    // Keep notification bodies short
    return trimmed.length > 120 ? `${trimmed.slice(0, 117)}...` : trimmed;
  }
  return `Starts at ${task.startTime}`;
}

// Resolve the effective tasks (materialized / virtual fixed / one-time) for the
// next SYNC_DAYS+1 days using the same business logic as the UI, and derive
// the full alarm payloads to schedule natively.
// Stable fingerprint of everything that affects how an alarm fires. Baked
// into the alarm id so that changing any related setting causes the diff to
// cancel the stale alarm and schedule a fresh one.
function alarmFingerprint(settings: AppSettings, style: "notification" | "alarm"): string {
  return [
    settings.reminderLeadMinutes,
    style === "alarm" ? "a" : "n",
    settings.alarmOnlyWhenLocked ? "L1" : "L0",
    settings.snoozeMinutes,
  ].join("-");
}

export async function computeDesiredAlarmPayloads(): Promise<
  Array<{
    id: string;
    title: string;
    body: string;
    fireAt: number;
    fullAlarm: boolean;
    onlyWhenLocked: boolean;
    snoozeMinutes: number;
  }>
> {
  const settings = getSettings();
  type Payload = {
    id: string;
    title: string;
    body: string;
    fireAt: number;
    fullAlarm: boolean;
    onlyWhenLocked: boolean;
    snoozeMinutes: number;
  };
  const payloads: Payload[] = [];
  if (!settings.notificationsEnabled) return payloads;

  const now = Date.now();

  for (let i = 0; i <= SYNC_DAYS; i++) {
    const day = addDays(startOfDay(new Date()), i);
    const dateStr = format(day, "yyyy-MM-dd");

    let tasksForDay: Task[];
    try {
      tasksForDay = await getTasksForDate(dateStr);
    } catch {
      continue;
    }

    for (const task of tasksForDay) {
      if (task.canceled) continue;
      const start = taskStartMillis(task, dateStr);
      if (start === null || start <= Date.now()) continue;

      // Per-task reminder mode; 'none' opts out entirely.
      const mode = task.reminder ?? "inherit";
      if (mode === "none") continue;
      const style: "notification" | "alarm" =
        mode === "inherit" ? settings.alarmStyle : mode;

      // Schedule the reminder at (start - lead), but never in the past: for
      // near-term tasks fall back to firing exactly at the task start. The
      // fallback is stable across syncs (it derives from the task itself, not
      // from the current clock), so it cannot cause re-scheduling loops.
      const rawFireAt = start - Math.max(0, settings.reminderLeadMinutes) * 60_000;
      const fireAt = rawFireAt > now ? rawFireAt : start;

      const id = `${task.id}#${dateStr}#${alarmFingerprint(settings, style)}`;
      payloads.push({
        id,
        title: task.title || "Task",
        body: alarmBody(task),
        fireAt,
        fullAlarm: style === "alarm",
        onlyWhenLocked: settings.alarmOnlyWhenLocked,
        snoozeMinutes: Math.max(1, Math.round(settings.snoozeMinutes)),
      });
    }
  }

  return payloads;
}

function parseScheduled(entries: string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const entry of entries) {
    const at = entry.lastIndexOf("@");
    if (at > 0) {
      const id = entry.slice(0, at);
      const ts = Number(entry.slice(at + 1));
      if (!Number.isNaN(ts)) map.set(id, ts);
    } else {
      map.set(entry, NaN); // legacy entry without timestamp -> always resynced
    }
  }
  return map;
}

let syncing: Promise<void> | null = null;

export async function syncTaskAlarms(): Promise<void> {
  if (!isNative()) return;
  if (syncing) return syncing;

  syncing = Promise.race([
    (async () => {
      try {
        console.log("[tw-sync] start");
        const settings = getSettings();
        const raw = await safeInvoke<string[]>("scheduled_alarm_ids");
        console.log("[tw-sync] scheduled:", JSON.stringify(raw));
        if (!raw) return;
        const scheduled = parseScheduled(raw);

        if (!settings.notificationsEnabled) {
          scheduled.forEach((_ts, id) => {
            void safeInvoke("cancel_task_alarm", { id });
          });
          return;
        }

        const payloads = await computeDesiredAlarmPayloads();
        console.log(
          "[tw-sync] desired:",
          JSON.stringify(payloads.map(p => ({ id: p.id, fireAt: p.fireAt })))
        );
        const desiredMap = new Map(payloads.map(p => [p.id, p]));

        // Cancel stale alarms (removed/edited/past tasks).
        const staleIds: string[] = [];
        scheduled.forEach((ts, id) => {
          const want = desiredMap.get(id);
          if (!want || want.fireAt !== ts) {
            staleIds.push(id);
          }
        });
        for (const id of staleIds) {
          await safeInvoke("cancel_task_alarm", { id });
        }

        // Schedule new/changed alarms.
        for (const p of payloads) {
          if (scheduled.get(p.id) !== p.fireAt) {
            console.log("[tw-sync] scheduling", p.id);
            await safeInvoke("schedule_task_alarm", {
              id: p.id,
              title: p.title,
              body: p.body,
              fireAtMillis: Math.round(p.fireAt),
              fullAlarm: p.fullAlarm,
              onlyWhenLocked: p.onlyWhenLocked,
              snoozeMinutes: p.snoozeMinutes,
            });
          }
        }
        console.log("[tw-sync] done");
      } catch (e) {
        console.warn("[tw-sync] FAILED:", e);
      } finally {
        syncing = null;
      }
    })(),
    new Promise<void>(resolve => {
      setTimeout(() => {
        console.warn("[tw-sync] timed out after 30s");
        syncing = null;
        resolve();
      }, 30_000);
    }),
  ]);

  return syncing;
}

// Debug handle for live inspection via remote debugging (CDP).
if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).__twSync = { syncTaskAlarms };
}
