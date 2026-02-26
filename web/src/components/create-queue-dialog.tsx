"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { createQueue, hasApiKey } from "@/lib/api";

export function CreateQueueDialog({ onCreated }: { onCreated?: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [maxRetries, setMaxRetries] = useState("3");
  const [claimTimeout, setClaimTimeout] = useState("600");
  const [dedupe, setDedupe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await createQueue({
        name,
        description,
        max_retries: Number(maxRetries),
        claim_timeout: Number(claimTimeout),
        dedupe,
      });
      setOpen(false);
      setName("");
      setDescription("");
      onCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create queue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-starglow/20 text-starglow/80 hover:bg-starglow/10 hover:border-starglow/30 hover:text-starglow text-xs h-8 transition-all">
          + Create Queue
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[hsl(224_40%_9%)] border-white/[0.07] shadow-2xl shadow-black/60">
        <DialogHeader>
          <DialogTitle className="text-sm">Create Queue</DialogTitle>
        </DialogHeader>
        {!hasApiKey() ? (
          <p className="text-xs text-muted-foreground/60 py-4">
            Set an API key in the top-right corner to create queues.
          </p>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="q-name" className="text-xs text-muted-foreground/70">Name</Label>
            <Input
              id="q-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-queue"
              pattern="^[a-z0-9][a-z0-9._-]*$"
              required
              className="text-xs h-8"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="q-desc" className="text-xs text-muted-foreground/70">Description</Label>
            <Input
              id="q-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
              className="text-xs h-8"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="q-retries" className="text-xs text-muted-foreground/70">Max Retries</Label>
              <Input id="q-retries" type="number" value={maxRetries} onChange={(e) => setMaxRetries(e.target.value)} className="text-xs h-8" />
              <p className="text-[10px] text-muted-foreground/40">Times a failed job is retried before giving up</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="q-timeout" className="text-xs text-muted-foreground/70">Claim Timeout (s)</Label>
              <Input id="q-timeout" type="number" value={claimTimeout} onChange={(e) => setClaimTimeout(e.target.value)} className="text-xs h-8" />
              <p className="text-[10px] text-muted-foreground/40">Seconds before an unfinished job is reassigned</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="q-dedupe"
              type="checkbox"
              checked={dedupe}
              onChange={(e) => setDedupe(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-white/[0.06] bg-void/60 accent-nebula/80"
            />
            <Label htmlFor="q-dedupe" className="text-xs text-muted-foreground/70 cursor-pointer">
              Deduplicate payloads
            </Label>
          </div>
          {error && <p className="text-destructive text-xs">{error}</p>}
          <DialogFooter>
            <Button type="submit" size="sm" disabled={loading} className="bg-starglow/15 border border-starglow/25 text-starglow hover:bg-starglow/25 hover:border-starglow/35 text-xs h-8 transition-all">
              {loading ? "Creating\u2026" : "Create"}
            </Button>
          </DialogFooter>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
