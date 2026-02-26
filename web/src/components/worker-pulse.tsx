"use client";

import { motion } from "framer-motion";

export function WorkerPulse({ id, idle }: { id: string; idle?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-void-light/60 border border-border/50">
      <div className="relative flex items-center justify-center">
        {!idle && (
          <motion.div
            className="absolute size-3 rounded-full bg-starglow/40"
            animate={{ scale: [1, 2, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        <div
          className={`size-2.5 rounded-full ${
            idle ? "bg-muted-foreground/40" : "bg-starglow"
          }`}
        />
      </div>
      <span className="text-xs font-mono text-muted-foreground truncate max-w-[140px]">
        {id}
      </span>
    </div>
  );
}
