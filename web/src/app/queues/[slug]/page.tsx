"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { LiveCounter } from "@/components/live-counter";
import { JobTable } from "@/components/job-table";
import { WorkerPulse } from "@/components/worker-pulse";
import { SubmitJobDialog } from "@/components/submit-job-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { getQueue, listJobs, deleteQueue, hasApiKey } from "@/lib/api";
import { usePolling } from "@/lib/use-polling";
import type { QueueInfo, JobInfo } from "@/lib/types";

const statusFilters = ["all", "pending", "claimed", "completed", "failed"] as const;

export default function QueueDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [jobs, setJobs] = useState<JobInfo[]>([]);
  const [cursor, setCursor] = useState<string>("");
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const queueFetcher = useCallback(() => getQueue(slug), [slug]);
  const { data: queue } = usePolling<QueueInfo>(queueFetcher, 2000);

  // Initial fetch + refresh on filter change
  const fetchInitial = useCallback(async () => {
    try {
      const res = await listJobs(slug, statusFilter === "all" ? undefined : statusFilter, 50);
      setJobs(res.jobs);
      setCursor(res.cursor);
      setHasMore(res.has_more);
    } catch {
      // silently fail on polling
    }
  }, [slug, statusFilter]);

  // Poll for initial page (refresh newest jobs)
  useEffect(() => {
    fetchInitial();
    const interval = setInterval(fetchInitial, 2000);
    return () => clearInterval(interval);
  }, [fetchInitial]);

  // Reset when filter changes
  useEffect(() => {
    setJobs([]);
    setCursor("");
    setHasMore(false);
  }, [statusFilter]);

  // Load more (next page)
  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await listJobs(slug, statusFilter === "all" ? undefined : statusFilter, 50, cursor);
      setJobs((prev) => {
        const existingIds = new Set(prev.map((j) => j.id));
        const newJobs = res.jobs.filter((j) => !existingIds.has(j.id));
        return [...prev, ...newJobs];
      });
      setCursor(res.cursor);
      setHasMore(res.has_more);
    } catch {
      // ignore
    } finally {
      setLoadingMore(false);
    }
  }, [slug, statusFilter, cursor, loadingMore]);

  // IntersectionObserver on sentinel
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMore();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadMore]);

  const chartData = Array.from({ length: 12 }, (_, i) => ({
    time: `${i * 5}s`,
    completed: Math.max(0, (queue?.completed || 0) - (12 - i) * Math.floor(Math.random() * 3)),
    failed: Math.max(0, (queue?.failed || 0) - (12 - i) * Math.floor(Math.random() * 1)),
  }));

  const workerIds = [...new Set(jobs.filter((j) => j.claimed_by).map((j) => j.claimed_by))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-semibold text-foreground">{slug}</h1>
            {queue && queue.workers > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-starglow/8 border border-starglow/15 px-2 py-0.5 text-[10px] font-medium text-starglow/80">
                <span className="size-1.5 rounded-full bg-starglow animate-pulse" />
                {queue.workers} active
              </span>
            )}
          </div>
          {queue?.description && (
            <p className="text-xs text-muted-foreground/50 mt-0.5">{queue.description}</p>
          )}
        </motion.div>
        <div className="flex items-center gap-2">
          <SubmitJobDialog queue={slug} onSubmitted={fetchInitial} />
          {hasApiKey() && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteOpen(true)}
                className="border-destructive/20 text-destructive/70 hover:bg-destructive/10 hover:text-destructive text-xs h-8"
              >
                Delete
              </Button>
              <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogContent className="bg-[hsl(222_42%_9%)] border-white/[0.06] shadow-2xl shadow-black/60">
                  <DialogHeader>
                    <DialogTitle className="text-sm">Delete queue <span className="text-destructive/80">{slug}</span>?</DialogTitle>
                  </DialogHeader>
                  <p className="text-xs text-muted-foreground/60">
                    This will permanently delete the queue, all its jobs, and statistics. This cannot be undone.
                  </p>
                  <DialogFooter className="gap-2">
                    <Button variant="outline" size="sm" onClick={() => setDeleteOpen(false)} className="text-xs h-8 border-white/[0.08]">
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      disabled={deleting}
                      onClick={async () => {
                        setDeleting(true);
                        try {
                          await deleteQueue(slug);
                          router.push("/queues");
                        } catch {
                          setDeleting(false);
                        }
                      }}
                      className="bg-destructive/80 hover:bg-destructive text-white text-xs h-8"
                    >
                      {deleting ? "Deleting\u2026" : "Yes, delete"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Pending", value: queue?.pending || 0, color: "text-warmstar/90" },
          { label: "Completed", value: queue?.completed || 0, color: "text-[hsl(150,60%,55%)]" },
          { label: "Failed", value: queue?.failed || 0, color: "text-destructive/80" },
          { label: "Stream", value: queue?.length || 0, color: "text-nebula/80" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="rounded-lg border border-white/[0.04] bg-white/[0.015] p-3"
          >
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground/40 mb-1">{stat.label}</p>
            <LiveCounter value={stat.value} className={`text-xl font-bold tabular-nums ${stat.color}`} />
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="jobs">
        <TabsList className="bg-white/[0.02] border border-white/[0.04]">
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
          <TabsTrigger value="workers">Workers</TabsTrigger>
          <TabsTrigger value="stats">Stats</TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="mt-4 space-y-3">
          <div className="flex items-center gap-1">
            {statusFilters.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                  statusFilter === s
                    ? "text-foreground bg-white/[0.06]"
                    : "text-muted-foreground/50 hover:text-foreground/70"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="rounded-lg border border-white/[0.04] overflow-hidden max-h-[600px] overflow-y-auto">
            <JobTable
              ref={sentinelRef}
              jobs={jobs}
              hasMore={hasMore}
              loadingMore={loadingMore}
            />
          </div>
        </TabsContent>

        <TabsContent value="workers" className="mt-4">
          <div className="rounded-lg border border-white/[0.04] bg-white/[0.015] p-5">
            <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground/40 font-medium mb-4">
              Active Workers
            </h3>
            {workerIds.length === 0 ? (
              <p className="text-xs text-muted-foreground/30 py-6 text-center">No active workers</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {workerIds.map((id) => (
                  <WorkerPulse key={id} id={id} />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="stats" className="mt-4">
          <div className="rounded-lg border border-white/[0.04] bg-white/[0.015] p-5">
            <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground/40 font-medium mb-4">
              Throughput
            </h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="gcomplete" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(190 85% 55%)" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="hsl(190 85% 55%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gfailed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(0 65% 55%)" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="hsl(0 65% 55%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" stroke="transparent" tick={{ fill: "hsl(220 15% 35%)", fontSize: 9 }} />
                  <YAxis stroke="transparent" tick={{ fill: "hsl(220 15% 35%)", fontSize: 9 }} width={30} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(222 42% 9%)",
                      border: "1px solid hsl(222 30% 16%)",
                      borderRadius: "6px",
                      fontSize: "11px",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                    }}
                  />
                  <Area type="monotone" dataKey="completed" stroke="hsl(190 85% 55%)" fill="url(#gcomplete)" strokeWidth={1.2} />
                  <Area type="monotone" dataKey="failed" stroke="hsl(0 65% 55%)" fill="url(#gfailed)" strokeWidth={1.2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
