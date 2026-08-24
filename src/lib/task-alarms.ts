import { getSettings } from "@/lib/settings";
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
export async function computeDesiredAlarmPayloads(): Promise<
  Array<{ id: string; title: string; body: string; fireAt: number }>
> {
  const settings = getSettings();
  const payloads: Array<{ id: string; title: string; body: string; fireAt: number }> = [];
  if (!settings.notificationsEnabled) return payloads;

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

      // Only schedule reminders that are still fully in the future. We never
      // retro-fire: if the lead time already passed at sync time, the reminder
      // for that occurrence is dropped (it will not be re-created later,
      // preventing duplicate/repeating notifications).
      const fireAt = start - Math.max(0, settings.reminderLeadMinutes) * 60_000;
      if (fireAt <= Date.now()) continue;

      const id = `${task.id}#${dateStr}`;
      payloads.push({
        id,
        title: task.title || "Task",
        body: alarmBody(task),
        fireAt,
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
        const fullAlarm = settings.alarmStyle === "alarm";
        for (const p of payloads) {
          if (scheduled.get(p.id) !== p.fireAt) {
            console.log("[tw-sync] scheduling", p.id);
            await safeInvoke("schedule_task_alarm", {
              id: p.id,
              title: p.title,
              body: p.body,
              fireAtMillis: Math.round(p.fireAt),
              fullAlarm,
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
