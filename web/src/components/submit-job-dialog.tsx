"use client";

import { useState, useRef } from "react";
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
import { submitJob, submitJobsBatch, hasApiKey } from "@/lib/api";

type Tab = "single" | "file";

export function SubmitJobDialog({ queue, onSubmitted }: { queue: string; onSubmitted?: () => void }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("single");
  const [payload, setPayload] = useState("{}");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  if (!hasApiKey()) return null;

  async function handleSubmitSingle(e: React.FormEvent) {
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

  async function handleSubmitFile(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Select a .jsonl file");
      return;
    }

    setLoading(true);
    setProgress("");
    try {
      const text = await file.text();
      const lines = text.split("\n").filter((l) => l.trim());
      const payloads: Record<string, unknown>[] = [];
      for (let i = 0; i < lines.length; i++) {
        try {
          payloads.push(JSON.parse(lines[i]));
        } catch {
          throw new Error(`Bad JSON on line ${i + 1}`);
        }
      }

      if (payloads.length === 0) {
        setError("File contains no jobs");
        setLoading(false);
        return;
      }

      const batchSize = 100;
      let submitted = 0;
      let skipped = 0;

      for (let start = 0; start < payloads.length; start += batchSize) {
        const batch = payloads.slice(start, start + batchSize);
        const result = await submitJobsBatch(
          queue,
          batch.map((p) => ({ payload: p }))
        );
        submitted += result.submitted;
        skipped += result.skipped;
        setProgress(`${submitted + skipped}/${payloads.length} processed`);
      }

      setProgress(`Done: ${submitted} submitted, ${skipped} skipped`);
      setTimeout(() => {
        setOpen(false);
        setProgress("");
        onSubmitted?.();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit jobs");
    } finally {
      setLoading(false);
    }
  }

  const tabClass = (t: Tab) =>
    `px-3 py-1 text-xs rounded-md cursor-pointer transition-colors ${
      tab === t
        ? "bg-nebula/20 text-foreground/90"
        : "text-muted-foreground/50 hover:text-muted-foreground/70"
    }`;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); setError(""); setProgress(""); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-white/[0.08] text-foreground/70 hover:bg-white/[0.04] text-xs h-8">
          Submit Job
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[hsl(222_42%_9%)] border-white/[0.06] shadow-2xl shadow-black/60">
        <DialogHeader>
          <DialogTitle className="text-sm">Submit Job to <span className="text-starglow/80">{queue}</span></DialogTitle>
        </DialogHeader>

        <div className="flex gap-1 mb-1">
          <button type="button" className={tabClass("single")} onClick={() => setTab("single")}>Single</button>
          <button type="button" className={tabClass("file")} onClick={() => setTab("file")}>File Upload</button>
        </div>

        {tab === "single" ? (
          <form onSubmit={handleSubmitSingle} className="space-y-3">
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
        ) : (
          <form onSubmit={handleSubmitFile} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="j-file" className="text-xs text-muted-foreground/70">JSONL File (one JSON object per line)</Label>
              <input
                id="j-file"
                ref={fileRef}
                type="file"
                accept=".jsonl,.json,.txt"
                className="w-full text-xs text-muted-foreground/70 file:mr-3 file:rounded-md file:border-0 file:bg-nebula/20 file:px-3 file:py-1.5 file:text-xs file:text-foreground/80 file:cursor-pointer hover:file:bg-nebula/30 transition-all"
              />
            </div>
            {progress && <p className="text-starglow/70 text-xs">{progress}</p>}
            {error && <p className="text-destructive text-xs">{error}</p>}
            <DialogFooter>
              <Button type="submit" size="sm" disabled={loading} className="bg-nebula/80 hover:bg-nebula/90 text-white text-xs h-8">
                {loading ? "Uploading\u2026" : "Upload & Submit"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
