"use client";

import { useCallback } from "react";
import { motion } from "framer-motion";
import { LiveCounter } from "@/components/live-counter";
import { listQueues } from "@/lib/api";
import { usePolling } from "@/lib/use-polling";
import type { QueueList } from "@/lib/types";

function StatCard({
  label,
  value,
  accentColor,
  delay,
}: {
  label: string;
  value: number;
  accentColor: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-4"
    >
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground/70 mb-2">
        {label}
      </p>
      <LiveCounter value={value} className={`text-2xl font-bold tabular-nums ${accentColor}`} />
    </motion.div>
  );
}

export default function DashboardPage() {
  const fetcher = useCallback(() => listQueues(), []);
  const { data, loading } = usePolling<QueueList>(fetcher, 5000);

  const queues = data?.queues || [];
  const totalQueues = queues.length;
  const activeJobs = queues.reduce((s, q) => s + q.pending, 0);
  const totalWorkers = queues.reduce((s, q) => s + q.workers, 0);
  const completed = queues.reduce((s, q) => s + q.completed, 0);

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <h1 className="text-lg font-semibold text-foreground">Dashboard</h1>
        <p className="text-xs text-muted-foreground/60 mt-0.5">
          Real-time overview
        </p>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Queues" value={totalQueues} accentColor="text-nebula" delay={0} />
        <StatCard label="Pending" value={activeJobs} accentColor="text-warmstar" delay={0.04} />
        <StatCard label="Workers" value={totalWorkers} accentColor="text-starglow" delay={0.08} />
        <StatCard label="Completed" value={completed} accentColor="text-[hsl(150,60%,55%)]" delay={0.12} />
      </div>

      {/* Queue list */}
      <div>
        <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium mb-3">
          Active Queues
        </h2>

        {!loading && queues.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-lg border border-dashed border-white/[0.06] py-16 flex flex-col items-center justify-center"
          >
            <svg viewBox="0 0 24 24" fill="none" className="size-8 text-muted-foreground/20 mb-3">
              <path
                d="M12 2L14.5 8.5L21 12L14.5 15.5L12 22L9.5 15.5L3 12L9.5 8.5L12 2Z"
                stroke="currentColor"
                strokeWidth="1"
              />
            </svg>
            <p className="text-xs text-muted-foreground/40">No queues yet</p>
            <p className="text-[10px] text-muted-foreground/25 mt-1">Set an API key and create one from the Queues page</p>
          </motion.div>
        ) : (
          <div className="rounded-lg border border-white/[0.04] overflow-hidden divide-y divide-white/[0.03]">
            {queues.map((q, i) => (
              <motion.a
                key={q.name}
                href={`/queues/${q.name}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 + i * 0.03 }}
                className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`size-1.5 rounded-full shrink-0 ${q.workers > 0 ? "bg-starglow" : "bg-muted-foreground/20"}`} />
                  <span className="text-sm font-medium text-foreground/90 truncate group-hover:text-foreground transition-colors">
                    {q.name}
                  </span>
                  {q.description && (
                    <span className="text-xs text-muted-foreground/40 truncate hidden sm:inline">
                      {q.description}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-5 text-[11px] text-muted-foreground/50 shrink-0 ml-4 tabular-nums">
                  <span>
                    <span className="text-warmstar/80 font-medium">{q.pending}</span>
                    <span className="ml-1 hidden sm:inline">pending</span>
                  </span>
                  <span>
                    <span className="text-starglow/70 font-medium">{q.completed}</span>
                    <span className="ml-1 hidden sm:inline">done</span>
                  </span>
                  <span>
                    <span className="text-foreground/60 font-medium">{q.workers}</span>
                    <span className="ml-1 hidden sm:inline">workers</span>
                  </span>
                  <svg viewBox="0 0 16 16" fill="currentColor" className="size-3 text-muted-foreground/20 group-hover:text-muted-foreground/40 transition-colors">
                    <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 011.06 0l3.25 3.25a.75.75 0 010 1.06l-3.25 3.25a.75.75 0 01-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 010-1.06z" clipRule="evenodd" />
                  </svg>
                </div>
              </motion.a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
