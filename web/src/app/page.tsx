"use client";

import { useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { LiveCounter } from "@/components/live-counter";
import { listQueues } from "@/lib/api";
import { usePolling } from "@/lib/use-polling";
import type { QueueList } from "@/lib/types";

function StatCard({
  label,
  value,
  color,
  icon,
  delay,
}: {
  label: string;
  value: number;
  color: string;
  icon: React.ReactNode;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      <Card className="bg-void-light/60 border-border/50 glow-nebula">
        <CardContent className="pt-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                {label}
              </p>
              <LiveCounter value={value} className={`text-3xl font-bold ${color}`} />
            </div>
            <div className="size-10 rounded-lg bg-void-lighter/60 flex items-center justify-center text-muted-foreground">
              {icon}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function DashboardPage() {
  const fetcher = useCallback(() => listQueues(), []);
  const { data } = usePolling<QueueList>(fetcher, 5000);

  const queues = data?.queues || [];
  const totalQueues = queues.length;
  const activeJobs = queues.reduce((s, q) => s + q.pending, 0);
  const totalWorkers = queues.reduce((s, q) => s + q.workers, 0);
  const throughput = queues.reduce((s, q) => s + q.completed, 0);

  return (
    <div className="space-y-8">
      <div>
        <motion.h1
          className="text-2xl font-bold text-foreground"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
        >
          Dashboard
        </motion.h1>
        <p className="text-sm text-muted-foreground mt-1">
          Real-time overview of your work queues
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Queues"
          value={totalQueues}
          color="text-nebula"
          delay={0}
          icon={
            <svg viewBox="0 0 20 20" fill="currentColor" className="size-5">
              <path d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 5A.75.75 0 012.75 9h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 9.75zm0 5a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75z" />
            </svg>
          }
        />
        <StatCard
          label="Active Jobs"
          value={activeJobs}
          color="text-warmstar"
          delay={0.05}
          icon={
            <svg viewBox="0 0 20 20" fill="currentColor" className="size-5">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" />
            </svg>
          }
        />
        <StatCard
          label="Workers"
          value={totalWorkers}
          color="text-starglow"
          delay={0.1}
          icon={
            <svg viewBox="0 0 20 20" fill="currentColor" className="size-5">
              <path d="M10 9a3 3 0 100-6 3 3 0 000 6zM6 8a2 2 0 11-4 0 2 2 0 014 0zM1.49 15.326a.78.78 0 01-.358-.442 3 3 0 014.308-3.516 6.484 6.484 0 00-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 01-2.07-.655zM16.44 15.98a4.97 4.97 0 002.07-.654.78.78 0 00.357-.442 3 3 0 00-4.308-3.517 6.484 6.484 0 011.907 3.96 2.32 2.32 0 01-.026.654zM18 8a2 2 0 11-4 0 2 2 0 014 0zM5.304 16.19a.844.844 0 01-.277-.71 5 5 0 019.947 0 .843.843 0 01-.277.71A6.975 6.975 0 0110 18a6.974 6.974 0 01-4.696-1.81z" />
            </svg>
          }
        />
        <StatCard
          label="Completed"
          value={throughput}
          color="text-[hsl(150,60%,50%)]"
          delay={0.15}
          icon={
            <svg viewBox="0 0 20 20" fill="currentColor" className="size-5">
              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
            </svg>
          }
        />
      </div>

      {/* Recent queues */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Active Queues
        </h2>
        {queues.length === 0 ? (
          <Card className="bg-void-light/40 border-border/30">
            <CardContent className="py-12 text-center text-muted-foreground">
              No queues yet. Create one to get started.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {queues.map((q, i) => (
              <motion.div
                key={q.name}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.05 }}
              >
                <a href={`/queues/${q.name}`}>
                  <Card className="bg-void-light/40 border-border/30 hover:border-nebula/30 transition-colors cursor-pointer">
                    <CardContent className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="size-2 rounded-full bg-starglow" />
                        <span className="font-medium text-sm">{q.name}</span>
                        {q.description && (
                          <span className="text-xs text-muted-foreground">
                            {q.description}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-6 text-xs text-muted-foreground">
                        <span>
                          <span className="text-warmstar font-medium">{q.pending}</span> pending
                        </span>
                        <span>
                          <span className="text-starglow font-medium">{q.completed}</span> done
                        </span>
                        <span>
                          <span className="text-foreground font-medium">{q.workers}</span> workers
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </a>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
