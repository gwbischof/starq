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
  const [claimTimeout, setClaimTimeout] = useState("300");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!hasApiKey()) return null;

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
        <Button className="bg-nebula hover:bg-nebula/80 text-white">
          Create Queue
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-void-light border-border/50">
        <DialogHeader>
          <DialogTitle>Create Queue</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="q-name">Name</Label>
            <Input
              id="q-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-queue"
              pattern="^[a-z0-9][a-z0-9._-]*$"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="q-desc">Description</Label>
            <Input
              id="q-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="q-retries">Max Retries</Label>
              <Input
                id="q-retries"
                type="number"
                value={maxRetries}
                onChange={(e) => setMaxRetries(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="q-timeout">Claim Timeout (s)</Label>
              <Input
                id="q-timeout"
                type="number"
                value={claimTimeout}
                onChange={(e) => setClaimTimeout(e.target.value)}
              />
            </div>
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={loading} className="bg-nebula hover:bg-nebula/80 text-white">
              {loading ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
