"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { LiveCounter } from "./live-counter";
import type { QueueInfo } from "@/lib/types";

function Spark({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const h = 20;
  const w = 56;
  const step = w / (values.length - 1);
  const pts = values.map((v, i) => `${i * step},${h - (v / max) * h * 0.8 - h * 0.1}`).join(" ");
  return (
    <svg width={w} height={h} className="opacity-40">
      <polyline
        points={pts}
        fill="none"
        stroke="hsl(190 80% 55%)"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function QueueCard({ queue }: { queue: QueueInfo }) {
  const spark = [0.2, 0.4, 0.3, 0.6, 0.5, 0.8, 0.7, 1].map(
    (m) => Math.max(1, queue.completed * m + queue.pending * (1 - m))
  );

  return (
    <Link href={`/${queue.name}`}>
      <motion.div
        whileHover={{ y: -1 }}
        transition={{ duration: 0.15 }}
        className="rounded-lg border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.035] hover:border-white/[0.08] transition-all cursor-pointer p-4 group"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className={`size-1.5 rounded-full shrink-0 ${queue.pending > 0 ? "bg-starglow" : "bg-muted-foreground/25"}`} />
              <h3 className="text-sm font-semibold text-foreground/90 truncate group-hover:text-foreground transition-colors">
                {queue.name}
              </h3>
              {queue.dedupe && (
                <span className="shrink-0 rounded-full bg-nebula/8 border border-nebula/15 px-1.5 py-px text-[9px] font-medium text-nebula/60">
                  dedupe
                </span>
              )}
            </div>
            {queue.description && (
              <p className="text-[11px] text-muted-foreground/40 truncate mt-1 pl-3.5">
                {queue.description}
              </p>
            )}
          </div>
          <Spark values={spark} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground/40 mb-0.5">Pending</p>
            <LiveCounter value={queue.pending} className="text-base font-semibold tabular-nums text-warmstar/90" />
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground/40 mb-0.5">Done</p>
            <LiveCounter value={queue.completed} className="text-base font-semibold tabular-nums text-starglow/80" />
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground/40 mb-0.5">Failed</p>
            <LiveCounter value={queue.failed} className="text-base font-semibold tabular-nums text-destructive/70" />
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
