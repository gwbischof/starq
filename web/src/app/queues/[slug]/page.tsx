"use client";

import { useCallback, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LiveCounter } from "@/components/live-counter";
import { JobTable } from "@/components/job-table";
import { WorkerPulse } from "@/components/worker-pulse";
import { SubmitJobDialog } from "@/components/submit-job-dialog";
import { getQueue, listJobs } from "@/lib/api";
import { usePolling } from "@/lib/use-polling";
import type { QueueInfo, JobList } from "@/lib/types";

const statusFilters = ["all", "pending", "claimed", "completed", "failed"] as const;

export default function QueueDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const queueFetcher = useCallback(() => getQueue(slug), [slug]);
  const jobsFetcher = useCallback(
    () => listJobs(slug, statusFilter === "all" ? undefined : statusFilter),
    [slug, statusFilter]
  );

  const { data: queue } = usePolling<QueueInfo>(queueFetcher, 2000);
  const { data: jobsData, refresh: refreshJobs } = usePolling<JobList>(jobsFetcher, 2000);

  const jobs = jobsData?.jobs || [];

  // Build chart data from historical snapshots (simulated from current stats)
  const chartData = Array.from({ length: 12 }, (_, i) => ({
    time: `${i * 5}s`,
    completed: Math.max(0, (queue?.completed || 0) - (12 - i) * Math.floor(Math.random() * 3)),
    failed: Math.max(0, (queue?.failed || 0) - (12 - i) * Math.floor(Math.random() * 1)),
  }));

  // Derive worker IDs from claimed jobs
  const workerIds = [...new Set(jobs.filter((j) => j.claimed_by).map((j) => j.claimed_by))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <motion.h1
              className="text-2xl font-bold text-foreground"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
            >
              {slug}
            </motion.h1>
            {queue && queue.workers > 0 && (
              <Badge className="bg-starglow/15 text-starglow border-starglow/30 text-[10px]">
                {queue.workers} worker{queue.workers !== 1 ? "s" : ""} active
              </Badge>
            )}
          </div>
          {queue?.description && (
            <p className="text-sm text-muted-foreground mt-1">{queue.description}</p>
          )}
        </div>
        <SubmitJobDialog queue={slug} onSubmitted={refreshJobs} />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Pending", value: queue?.pending || 0, color: "text-warmstar" },
          { label: "Completed", value: queue?.completed || 0, color: "text-[hsl(150,60%,50%)]" },
          { label: "Failed", value: queue?.failed || 0, color: "text-destructive" },
          { label: "Stream Length", value: queue?.length || 0, color: "text-nebula" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="bg-void-light/40 border-border/30">
              <CardContent className="pt-4 pb-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                  {stat.label}
                </p>
                <LiveCounter value={stat.value} className={`text-2xl font-bold ${stat.color}`} />
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="jobs">
        <TabsList className="bg-void-light/60 border border-border/30">
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
          <TabsTrigger value="workers">Workers</TabsTrigger>
          <TabsTrigger value="stats">Stats</TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="mt-4 space-y-4">
          <div className="flex items-center gap-2">
            {statusFilters.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? "bg-nebula/20 text-starglow"
                    : "text-muted-foreground hover:text-foreground hover:bg-void-lighter/50"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <Card className="bg-void-light/40 border-border/30 overflow-hidden">
            <JobTable jobs={jobs} />
          </Card>
        </TabsContent>

        <TabsContent value="workers" className="mt-4">
          <Card className="bg-void-light/40 border-border/30">
            <CardHeader>
              <CardTitle className="text-sm">Active Workers</CardTitle>
            </CardHeader>
            <CardContent>
              {workerIds.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No active workers</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {workerIds.map((id) => (
                    <WorkerPulse key={id} id={id} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="mt-4">
          <Card className="bg-void-light/40 border-border/30">
            <CardHeader>
              <CardTitle className="text-sm">Throughput</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="gradCompleted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(190 95% 55%)" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="hsl(190 95% 55%)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradFailed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(0 72% 55%)" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="hsl(0 72% 55%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="time"
                      stroke="hsl(220 15% 35%)"
                      tick={{ fill: "hsl(220 15% 50%)", fontSize: 10 }}
                    />
                    <YAxis
                      stroke="hsl(220 15% 35%)"
                      tick={{ fill: "hsl(220 15% 50%)", fontSize: 10 }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(222 40% 10%)",
                        border: "1px solid hsl(222 30% 18%)",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="completed"
                      stroke="hsl(190 95% 55%)"
                      fill="url(#gradCompleted)"
                      strokeWidth={1.5}
                    />
                    <Area
                      type="monotone"
                      dataKey="failed"
                      stroke="hsl(0 72% 55%)"
                      fill="url(#gradFailed)"
                      strokeWidth={1.5}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
