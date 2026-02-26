"use client";

import { useCallback } from "react";
import { motion } from "framer-motion";
import { QueueCard } from "@/components/queue-card";
import { CreateQueueDialog } from "@/components/create-queue-dialog";
import { listQueues } from "@/lib/api";
import { usePolling } from "@/lib/use-polling";
import type { QueueList } from "@/lib/types";

export default function QueuesPage() {
  const fetcher = useCallback(() => listQueues(), []);
  const { data, refresh, loading } = usePolling<QueueList>(fetcher, 5000);
  const queues = data?.queues || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h1 className="text-lg font-semibold text-foreground">Queues</h1>
          <p className="text-xs text-muted-foreground/60 mt-0.5">
            {queues.length} queue{queues.length !== 1 ? "s" : ""} registered
          </p>
        </motion.div>
        <CreateQueueDialog onCreated={refresh} />
      </div>

      {!loading && queues.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-lg border border-dashed border-white/[0.06] py-20 flex flex-col items-center"
        >
          <svg viewBox="0 0 24 24" fill="none" className="size-8 text-muted-foreground/15 mb-3">
            <path d="M12 2L14.5 8.5L21 12L14.5 15.5L12 22L9.5 15.5L3 12L9.5 8.5L12 2Z" stroke="currentColor" strokeWidth="1" />
          </svg>
          <p className="text-xs text-muted-foreground/35">No queues created yet</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {queues.map((q, i) => (
            <motion.div
              key={q.name}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.3 }}
            >
              <QueueCard queue={q} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
