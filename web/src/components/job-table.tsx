"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { JobInfo } from "@/lib/types";

const statusClass: Record<string, string> = {
  pending: "status-pending",
  claimed: "status-claimed",
  completed: "status-completed",
  failed: "status-failed",
};

function formatTime(ts: string) {
  if (!ts || ts === "0") return "—";
  const d = new Date(Number(ts) * 1000);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function JobTable({ jobs }: { jobs: JobInfo[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-border/40 hover:bg-transparent">
          <TableHead className="text-muted-foreground text-xs">ID</TableHead>
          <TableHead className="text-muted-foreground text-xs">Status</TableHead>
          <TableHead className="text-muted-foreground text-xs">Worker</TableHead>
          <TableHead className="text-muted-foreground text-xs">Created</TableHead>
          <TableHead className="text-muted-foreground text-xs">Retries</TableHead>
          <TableHead className="text-muted-foreground text-xs">Payload</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {jobs.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
              No jobs yet
            </TableCell>
          </TableRow>
        )}
        {jobs.map((job) => (
          <TableRow key={job.id} className="border-border/30 hover:bg-void-lighter/30">
            <TableCell className="font-mono text-xs text-muted-foreground max-w-[120px] truncate">
              {job.id}
            </TableCell>
            <TableCell>
              <Badge
                variant="outline"
                className={`text-[10px] uppercase tracking-wider border ${statusClass[job.status] || ""}`}
              >
                {job.status}
              </Badge>
            </TableCell>
            <TableCell className="font-mono text-xs text-muted-foreground">
              {job.claimed_by || "—"}
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {formatTime(job.created_at)}
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {job.retries}
            </TableCell>
            <TableCell className="font-mono text-xs text-muted-foreground max-w-[200px] truncate">
              {JSON.stringify(job.payload)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
