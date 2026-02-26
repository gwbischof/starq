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
  const { data, refresh } = usePolling<QueueList>(fetcher, 5000);

  const queues = data?.queues || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <motion.h1
            className="text-2xl font-bold text-foreground"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            Queues
          </motion.h1>
          <p className="text-sm text-muted-foreground mt-1">
            {queues.length} queue{queues.length !== 1 ? "s" : ""} registered
          </p>
        </div>
        <CreateQueueDialog onCreated={refresh} />
      </div>

      {queues.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-24 text-muted-foreground"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="size-12 mb-4 opacity-30">
            <path d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 5A.75.75 0 012.75 9h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 9.75zm0 5a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75z" />
          </svg>
          <p className="text-sm">No queues created yet</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {queues.map((q, i) => (
            <motion.div
              key={q.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <QueueCard queue={q} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
