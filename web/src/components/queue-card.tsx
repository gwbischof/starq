"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LiveCounter } from "./live-counter";
import type { QueueInfo } from "@/lib/types";

function MiniSparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const h = 24;
  const w = 80;
  const step = w / (values.length - 1);
  const points = values.map((v, i) => `${i * step},${h - (v / max) * h}`).join(" ");

  return (
    <svg width={w} height={h} className="opacity-60">
      <polyline
        points={points}
        fill="none"
        stroke="hsl(190 95% 55%)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function QueueCard({ queue }: { queue: QueueInfo }) {
  // Generate sparkline data from available stats
  const sparkline = [
    queue.completed * 0.3,
    queue.completed * 0.5,
    queue.completed * 0.7,
    queue.completed * 0.6,
    queue.completed * 0.9,
    queue.completed,
  ];

  return (
    <Link href={`/queues/${queue.name}`}>
      <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
        <Card className="bg-void-light/60 border-border/50 hover:border-nebula/30 transition-colors cursor-pointer glow-nebula">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground">
                {queue.name}
              </CardTitle>
              <MiniSparkline values={sparkline} />
            </div>
            {queue.description && (
              <p className="text-xs text-muted-foreground truncate">{queue.description}</p>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Pending
                </p>
                <LiveCounter
                  value={queue.pending}
                  className="text-lg font-semibold text-warmstar"
                />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Done
                </p>
                <LiveCounter
                  value={queue.completed}
                  className="text-lg font-semibold text-starglow"
                />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Workers
                </p>
                <div className="flex items-center gap-1.5">
                  {queue.workers > 0 && (
                    <span className="size-2 rounded-full bg-starglow animate-pulse-glow" />
                  )}
                  <LiveCounter
                    value={queue.workers}
                    className="text-lg font-semibold text-foreground"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </Link>
  );
}
