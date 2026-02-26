"use client";

import { motion } from "framer-motion";

export function WorkerPulse({ id, idle }: { id: string; idle?: boolean }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/[0.025] border border-white/[0.04]">
      <div className="relative flex items-center justify-center">
        {!idle && (
          <motion.div
            className="absolute size-2.5 rounded-full bg-starglow/30"
            animate={{ scale: [1, 1.8, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        <div className={`size-2 rounded-full ${idle ? "bg-muted-foreground/20" : "bg-starglow/80"}`} />
      </div>
      <span className="text-[11px] font-mono text-muted-foreground/50 truncate max-w-[120px]">
        {id}
      </span>
    </div>
  );
}
