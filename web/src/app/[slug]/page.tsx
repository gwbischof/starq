"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { LiveCounter } from "@/components/live-counter";
import { JobTable } from "@/components/job-table";
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

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/70 hover:text-foreground/80 transition-colors">
        <svg viewBox="0 0 16 16" fill="currentColor" className="size-3">
          <path fillRule="evenodd" d="M9.78 11.78a.75.75 0 01-1.06 0L5.47 8.53a.75.75 0 010-1.06l3.25-3.25a.75.75 0 111.06 1.06L7.06 8l2.72 2.72a.75.75 0 010 1.06z" clipRule="evenodd" />
        </svg>
        All queues
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-semibold text-foreground">{slug}</h1>
            {queue?.dedupe && (
              <span className="inline-flex items-center rounded-full bg-nebula/10 border border-nebula/20 px-2 py-0.5 text-[10px] font-medium text-nebula/70">
                dedupe
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
                <DialogContent className="bg-[hsl(224_40%_9%)] border-white/[0.07] shadow-2xl shadow-black/60">
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
                          router.push("/");
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
          { label: "Pending", value: queue?.pending || 0, color: "text-warmstar" },
          { label: "Claimed", value: queue?.claimed || 0, color: "text-starglow/80" },
          { label: "Completed", value: queue?.completed || 0, color: "text-aurora" },
          { label: "Failed", value: queue?.failed || 0, color: "text-destructive/80" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
          >
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground/50 mb-1">{stat.label}</p>
            <LiveCounter value={stat.value} className={`text-xl font-bold tabular-nums ${stat.color}`} />
          </motion.div>
        ))}
      </div>

      {/* Jobs */}
      <div className="space-y-3">
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
        <div className="rounded-lg border border-white/[0.06] overflow-hidden max-h-[600px] overflow-y-auto">
          <JobTable
            ref={sentinelRef}
            jobs={jobs}
            hasMore={hasMore}
            loadingMore={loadingMore}
          />
        </div>
      </div>
    </div>
  );
}
