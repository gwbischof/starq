"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ApiKeyInput } from "./api-key-input";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/queues", label: "Queues" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-40 border-b border-white/[0.04] bg-[hsl(222_47%_6%)]/90 backdrop-blur-2xl">
      <div className="mx-auto flex h-12 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-7">
          <Link href="/" className="flex items-center gap-2 group">
            <svg viewBox="0 0 24 24" fill="none" className="size-5 transition-transform group-hover:rotate-12 duration-300">
              <path
                d="M12 2L14.5 8.5L21 12L14.5 15.5L12 22L9.5 15.5L3 12L9.5 8.5L12 2Z"
                fill="hsl(190 95% 55%)"
                fillOpacity="0.9"
              />
              <path
                d="M12 6L13.2 9.8L17 12L13.2 14.2L12 18L10.8 14.2L7 12L10.8 9.8L12 6Z"
                fill="hsl(48 100% 90%)"
                fillOpacity="0.6"
              />
            </svg>
            <span className="text-sm font-semibold tracking-tight text-foreground/90 group-hover:text-foreground transition-colors">
              Starq
            </span>
          </Link>

          <div className="flex items-center gap-0.5">
            {links.map(({ href, label }) => {
              const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                    active
                      ? "text-foreground bg-white/[0.06]"
                      : "text-muted-foreground hover:text-foreground/80"
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </div>

        <ApiKeyInput />
      </div>
    </nav>
  );
}
