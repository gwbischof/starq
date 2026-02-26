"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Check, ChevronDown, Eye, EyeOff } from "lucide-react";

export function ApiKeyInput() {
  const [key, setKey] = useState("");
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("starq-api-key");
    if (stored) {
      setKey(stored);
      setSaved(true);
    }
  }, []);

  // Click outside to close
  useEffect(() => {
    if (!expanded) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [expanded]);

  const save = () => {
    if (!key.trim()) return;
    localStorage.setItem("starq-api-key", key.trim());
    setSaved(true);
    setExpanded(false);
    // Force a re-render across components that check hasApiKey
    window.dispatchEvent(new Event("storage"));
  };

  const clear = () => {
    localStorage.removeItem("starq-api-key");
    setKey("");
    setSaved(false);
    setExpanded(false);
    window.dispatchEvent(new Event("storage"));
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Trigger button — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`
          rounded-full px-3.5 py-1.5 flex items-center gap-2 text-xs cursor-pointer
          transition-all duration-200 border
          ${saved
            ? "bg-starglow/8 border-starglow/20 hover:border-starglow/40 text-starglow"
            : "bg-void-lighter/40 border-border/40 hover:border-nebula/40 text-muted-foreground hover:text-foreground"
          }
        `}
      >
        {saved ? (
          <Check className="w-3 h-3" />
        ) : (
          <Lock className="w-3 h-3" />
        )}
        <span className="tracking-wide uppercase font-medium text-[10px]">
          {saved ? "API Key" : "Set Key"}
        </span>
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 top-full mt-2 z-50 w-72 rounded-lg border border-white/[0.07] bg-[hsl(224_40%_9%)] shadow-xl shadow-black/40 overflow-hidden"
          >
            {/* Header accent line */}
            <div className="h-px bg-gradient-to-r from-transparent via-nebula/30 to-transparent" />

            <div className="p-3.5">
              <div className="flex items-center gap-2 mb-3">
                <Lock className="w-3 h-3 text-nebula" />
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
                  API Authentication
                </span>
              </div>

              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && save()}
                  placeholder="Paste your API key…"
                  autoFocus
                  className="
                    w-full rounded-md border border-border/60 bg-void/80
                    px-3 py-2 pr-9 text-xs text-foreground font-mono
                    placeholder:text-muted-foreground/30
                    focus:outline-none focus:border-nebula/50 focus:ring-1 focus:ring-nebula/20
                    transition-all
                  "
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
                >
                  {showKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </button>
              </div>

              <div className="flex gap-1.5 mt-3">
                <button
                  onClick={save}
                  disabled={!key.trim()}
                  className="
                    flex-1 rounded-md py-1.5 text-[10px] font-semibold uppercase tracking-wider
                    bg-nebula/20 text-nebula border border-nebula/25
                    hover:bg-nebula/30 hover:border-nebula/40
                    disabled:opacity-25 disabled:cursor-not-allowed
                    transition-all
                  "
                >
                  Save
                </button>
                {saved && (
                  <button
                    onClick={clear}
                    className="
                      rounded-md px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider
                      bg-destructive/10 text-destructive/60 border border-destructive/15
                      hover:bg-destructive/20 hover:text-destructive/80
                      transition-all
                    "
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
