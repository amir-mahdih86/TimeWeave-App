import { useEffect, useMemo, useRef, useState } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSettings, formatTime } from "@/lib/settings";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface TimePickerProps {
  /** Value in 24-hour "HH:mm" format */
  value: string;
  onChange: (value: string) => void;
  id?: string;
  disabled?: boolean;
  className?: string;
}

const ITEM_H = 44;
const VISIBLE_ITEMS = 5;

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function parseHHmm(value: string): { h: number; m: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return { h, m: min };
}

// Vertical snap-list that reports the centered item. The list is rendered
// three times back-to-back so it loops endlessly; after settling near an
// edge copy we silently re-center on the middle one.
function Wheel<T extends number | string>({
  items,
  index,
  onIndexChange,
  render,
}: {
  items: T[];
  index: number;
  onIndexChange: (index: number) => void;
  render: (item: T, selected: boolean) => React.ReactNode;
}) {
  const len = items.length;
  const ref = useRef<HTMLDivElement>(null);
  const programmaticUntil = useRef(0);
  const debounce = useRef<number | undefined>(undefined);
  // Absolute position within the tripled list; kept in the middle copy.
  const absRef = useRef(len + index);

  const scrollToAbs = (abs: number, smooth = true) => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ top: abs * ITEM_H, behavior: smooth ? "smooth" : "auto" });
  };

  useEffect(() => {
    scrollToAbs(absRef.current, false);
    programmaticUntil.current = Date.now() + 80;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [len]);

  const settle = () => {
    const el = ref.current;
    if (!el) return;
    let abs = Math.round(el.scrollTop / ITEM_H);
    const wrapped = ((abs % len) + len) % len;

    if (wrapped !== index) onIndexChange(wrapped);

    // Re-center into the middle copy without animation.
    if (abs < len || abs >= 2 * len) {
      abs = len + wrapped;
      scrollToAbs(abs, false);
      programmaticUntil.current = Date.now() + 120;
    }
  };

  const handleScroll = () => {
    const el = ref.current;
    if (!el) return;
    if (Date.now() < programmaticUntil.current) return;
    window.clearTimeout(debounce.current);
    debounce.current = window.setTimeout(settle, 140);
  };

  return (
    <div className="relative">
      {/* selection highlight */}
      <div
        className="pointer-events-none absolute inset-x-1 rounded-lg bg-primary/10 border border-primary/20"
        style={{ top: `calc(50% - ${ITEM_H / 2}px)`, height: ITEM_H }}
      />
      <div
        ref={ref}
        onScroll={handleScroll}
        className="no-scrollbar snap-y snap-mandatory overflow-y-auto overscroll-contain"
        style={{ height: ITEM_H * VISIBLE_ITEMS }}
      >
        <div style={{ height: ((VISIBLE_ITEMS - 1) / 2) * ITEM_H }} />
        {[0, 1, 2].map(copy =>
          items.map((item, i) => {
            const abs = copy * len + i;
            return (
              <div
                key={`${copy}-${item}`}
                className="snap-center flex items-center justify-center cursor-pointer select-none"
                style={{ height: ITEM_H }}
                onClick={() => {
                  // Always land on the middle copy so the list stays centered.
                  absRef.current = len + i;
                  onIndexChange(i);
                  scrollToAbs(absRef.current);
                  programmaticUntil.current = Date.now() + 350;
                }}
              >
                {render(item, i === index)}
              </div>
            );
          })
        )}
        <div style={{ height: ((VISIBLE_ITEMS - 1) / 2) * ITEM_H }} />
      </div>
    </div>
  );
}

export function TimePicker({ value, onChange, id, disabled, className }: TimePickerProps) {
  const timeFormat = getSettings().timeFormat;
  const is12h = timeFormat === "12";

  const parsed = parseHHmm(value);
  const initial = parsed ?? (() => {
    const d = new Date();
    return { h: d.getHours(), m: Math.floor(d.getMinutes() / 5) * 5 };
  })();

  const [open, setOpen] = useState(false);
  const [hourIdx, setHourIdx] = useState(() =>
    is12h ? (initial.h % 12 === 0 ? 11 : (initial.h % 12) - 1) : initial.h
  );
  const [minuteIdx, setMinuteIdx] = useState(() => initial.m);
  const [pm, setPm] = useState(() => initial.h >= 12);

  const hours = useMemo(
    () => (is12h ? Array.from({ length: 12 }, (_, i) => i + 1) : Array.from({ length: 24 }, (_, i) => i)),
    [is12h]
  );
  const minutes = useMemo(() => Array.from({ length: 60 }, (_, i) => i), []);

  const draftH24 = useMemo(() => {
    let h: number;
    if (is12h) {
      h = hourIdx + 1; // 1..12
      if (pm && h !== 12) h += 12;
      if (!pm && h === 12) h = 0;
    } else {
      h = hourIdx;
    }
    return h;
  }, [is12h, hourIdx, pm]);

  useEffect(() => {
    if (!open) return;
    // Re-seed draft state from the current value each time the dialog opens.
    const p = parseHHmm(value) ?? (() => {
      const d = new Date();
      return { h: d.getHours(), m: Math.floor(d.getMinutes() / 5) * 5 };
    })();
    setHourIdx(is12h ? (p.h % 12 === 0 ? 11 : (p.h % 12) - 1) : p.h);
    setMinuteIdx(p.m);
    setPm(p.h >= 12);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const commit = () => {
    onChange(`${pad(draftH24)}:${pad(minuteIdx)}`);
    setOpen(false);
  };

  const setToNow = () => {
    const d = new Date();
    setHourIdx(is12h ? (d.getHours() % 12 === 0 ? 11 : (d.getHours() % 12) - 1) : d.getHours());
    setMinuteIdx(d.getMinutes());
    setPm(d.getHours() >= 12);
  };

  const preview = `${pad(draftH24)}:${pad(minuteIdx)}`;

  return (
    <>
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-9 w-full items-center gap-2 rounded-md border border-input bg-transparent px-3 py-1",
          "text-sm shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          !parsed && "text-muted-foreground",
          className
        )}
      >
        <Clock className="h-4 w-4 text-primary shrink-0" />
        <span className="tabular-nums font-medium">
          {formatTime(`${pad(initial.h)}:${pad(initial.m)}`, timeFormat)}
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[320px] gap-4">
          <DialogHeader>
            <DialogTitle className="text-center text-base">Select time</DialogTitle>
          </DialogHeader>

          <div className="rounded-xl bg-secondary/50 px-3 py-3">
            <div className="flex items-stretch gap-2">
              <div className="flex-1">
                <p className="mb-1 text-center text-[11px] uppercase tracking-wide text-muted-foreground">Hour</p>
                <Wheel
                  items={hours}
                  index={hourIdx}
                  onIndexChange={setHourIdx}
                  render={(h, sel) => (
                    <span className={cn("text-lg tabular-nums", sel ? "font-bold text-foreground" : "text-muted-foreground")}>
                      {is12h ? h : pad(h)}
                    </span>
                  )}
                />
              </div>
              <div className="flex flex-col items-center justify-center pb-2">
                <span className="text-xl font-bold text-primary">:</span>
              </div>
              <div className="flex-1">
                <p className="mb-1 text-center text-[11px] uppercase tracking-wide text-muted-foreground">Minute</p>
                <Wheel
                  items={minutes}
                  index={minuteIdx}
                  onIndexChange={setMinuteIdx}
                  render={(m, sel) => (
                    <span className={cn("text-lg tabular-nums", sel ? "font-bold text-foreground" : "text-muted-foreground")}>
                      {pad(m)}
                    </span>
                  )}
                />
              </div>
              {is12h && (
                <div className="flex flex-col justify-center gap-1 pr-1">
                  {(["AM", "PM"] as const).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPm(p === "PM")}
                      className={cn(
                        "rounded-md px-2 py-1 text-xs font-semibold transition-colors",
                        (p === "PM") === pm
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent"
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" className="mr-auto" onClick={setToNow}>
              Now
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={commit}>
              Set {preview}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
