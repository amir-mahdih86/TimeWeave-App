import { Plus } from "lucide-react";
import { motion } from "framer-motion";

interface FreeTimeSlotProps {
  startTime: string;
  endTime: string;
  onClick: () => void;
}

export function FreeTimeSlot({ startTime, endTime, onClick }: FreeTimeSlotProps) {
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
      className="w-full group flex items-center justify-between p-4 my-2 rounded-xl border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all duration-200"
    >
      <div className="flex flex-col items-start">
        <span className="text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors">
          Free Time
        </span>
        <span className="text-xs text-muted-foreground/70">
          {startTime} - {endTime} ({duration}m)
        </span>
      </div>
      
      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-200">
        <Plus className="w-5 h-5" />
      </div>
    </motion.button>
  );
}
