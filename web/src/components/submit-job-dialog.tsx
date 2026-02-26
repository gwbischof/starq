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
        <Button variant="outline" size="sm" className="border-white/[0.08] text-foreground/70 hover:bg-white/[0.04] text-xs h-8">
          Submit Job
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[hsl(222_42%_9%)] border-white/[0.06] shadow-2xl shadow-black/60">
        <DialogHeader>
          <DialogTitle className="text-sm">Submit Job to <span className="text-starglow/80">{queue}</span></DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="j-payload" className="text-xs text-muted-foreground/70">Payload (JSON)</Label>
            <textarea
              id="j-payload"
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              className="w-full h-28 rounded-md border border-white/[0.06] bg-void/60 px-3 py-2 text-xs font-mono text-foreground/80 focus:border-nebula/40 focus:outline-none focus:ring-1 focus:ring-nebula/20 transition-all resize-none"
            />
          </div>
          {error && <p className="text-destructive text-xs">{error}</p>}
          <DialogFooter>
            <Button type="submit" size="sm" disabled={loading} className="bg-nebula/80 hover:bg-nebula/90 text-white text-xs h-8">
              {loading ? "Submitting\u2026" : "Submit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
