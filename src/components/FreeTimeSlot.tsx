import { Plus } from "lucide-react";
import { motion } from "framer-motion";
import { formatTime } from "@/lib/settings";
import { useSettings } from "@/hooks/use-settings";

interface FreeTimeSlotProps {
  startTime: string;
  endTime: string;
  onClick: () => void;
}

export function FreeTimeSlot({ startTime, endTime, onClick }: FreeTimeSlotProps) {
  const { settings } = useSettings();
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const duration = (endH * 60 + endM) - (startH * 60 + startM);

  // Don't show slots smaller than 15 mins unless really needed
  if (duration < 15) return null;

  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="w-full group flex items-center justify-between p-3.5 my-1.5 rounded-xl border border-dashed border-border/70 bg-transparent hover:border-primary/50 hover:bg-primary/[0.04] transition-all duration-200"
    >
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-muted-foreground/80 tabular-nums group-hover:text-primary transition-colors">
          {formatTime(startTime, settings.timeFormat)} – {formatTime(endTime, settings.timeFormat)}
        </span>
        <span className="text-[11px] text-muted-foreground/60">
          {duration}m free
        </span>
      </div>

      <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground group-hover:rotate-90 transition-all duration-300">
        <Plus className="w-4 h-4" />
      </div>
    </motion.button>
  );
}
