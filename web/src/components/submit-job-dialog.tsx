"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { submitJob, hasApiKey } from "@/lib/api";

export function SubmitJobDialog({ queue, onSubmitted }: { queue: string; onSubmitted?: () => void }) {
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState("{}");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!hasApiKey()) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const parsed = JSON.parse(payload);
      await submitJob(queue, { payload: parsed });
      setOpen(false);
      setPayload("{}");
      onSubmitted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit job");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-starglow/30 text-starglow hover:bg-starglow/10">
          Submit Job
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-void-light border-border/50">
        <DialogHeader>
          <DialogTitle>Submit Job to {queue}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="j-payload">Payload (JSON)</Label>
            <textarea
              id="j-payload"
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              className="w-full h-32 rounded-md border border-border bg-void/60 px-3 py-2 text-sm font-mono text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/50"
            />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={loading} className="bg-nebula hover:bg-nebula/80 text-white">
              {loading ? "Submitting..." : "Submit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
