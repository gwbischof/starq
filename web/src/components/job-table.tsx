"use client";

import { forwardRef } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { JobInfo } from "@/lib/types";

const statusColors: Record<string, string> = {
  pending: "bg-warmstar/15 text-warmstar/90 border-warmstar/20",
  claimed: "bg-starglow/12 text-starglow/85 border-starglow/20",
  completed: "bg-[hsl(150,60%,50%)]/12 text-[hsl(150,60%,55%)] border-[hsl(150,60%,50%)]/20",
  failed: "bg-destructive/12 text-destructive/80 border-destructive/20",
};

function formatTime(ts: string) {
  if (!ts || ts === "0") return "\u2014";
  const d = new Date(Number(ts) * 1000);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function StatusDot({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-wider font-medium ${statusColors[status] || "text-muted-foreground"}`}>
      {status}
    </span>
  );
}

interface JobTableProps {
  jobs: JobInfo[];
  hasMore?: boolean;
  loadingMore?: boolean;
}

export const JobTable = forwardRef<HTMLDivElement, JobTableProps>(
  function JobTable({ jobs, hasMore, loadingMore }, sentinelRef) {
    return (
      <>
        <Table>
          <TableHeader>
            <TableRow className="border-white/[0.03] hover:bg-transparent">
              <TableHead className="text-muted-foreground/40 text-[10px] uppercase tracking-wider font-medium">ID</TableHead>
              <TableHead className="text-muted-foreground/40 text-[10px] uppercase tracking-wider font-medium">Status</TableHead>
              <TableHead className="text-muted-foreground/40 text-[10px] uppercase tracking-wider font-medium">Worker</TableHead>
              <TableHead className="text-muted-foreground/40 text-[10px] uppercase tracking-wider font-medium">Created</TableHead>
              <TableHead className="text-muted-foreground/40 text-[10px] uppercase tracking-wider font-medium">Retries</TableHead>
              <TableHead className="text-muted-foreground/40 text-[10px] uppercase tracking-wider font-medium">Payload</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.length === 0 && !loadingMore && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground/30 py-10 text-xs">
                  No jobs
                </TableCell>
              </TableRow>
            )}
            {jobs.map((job) => (
              <TableRow key={job.id} className="border-white/[0.025] hover:bg-white/[0.015]">
                <TableCell className="font-mono text-[11px] text-muted-foreground/50 max-w-[100px] truncate">
                  {job.id}
                </TableCell>
                <TableCell>
                  <StatusDot status={job.status} />
                </TableCell>
                <TableCell className="font-mono text-[11px] text-muted-foreground/45">
                  {job.claimed_by || "\u2014"}
                </TableCell>
                <TableCell className="text-[11px] text-muted-foreground/45 tabular-nums">
                  {formatTime(job.created_at)}
                </TableCell>
                <TableCell className="text-[11px] text-muted-foreground/45 tabular-nums">
                  {job.retries}
                </TableCell>
                <TableCell className="font-mono text-[11px] text-muted-foreground/35 max-w-[180px] truncate">
                  {JSON.stringify(job.payload)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {/* Infinite scroll sentinel */}
        {hasMore && (
          <div ref={sentinelRef} className="flex items-center justify-center py-4">
            {loadingMore ? (
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground/40">
                <span className="size-3 rounded-full border-2 border-nebula/30 border-t-nebula/80 animate-spin" />
                Loading more...
              </div>
            ) : (
              <span className="text-[11px] text-muted-foreground/20">Scroll for more</span>
            )}
          </div>
        )}
      </>
    );
  }
);
