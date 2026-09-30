import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useSettings } from "./SettingsContext";

const NAV = [
  { label: "Dashboard", to: "/tool/prdtool" as const },
  { label: "Builder", to: "/tool/prdtool/builder" as const },
  { label: "Viewer", to: "/tool/prdtool/viewer" as const },
  { label: "Settings", to: "/tool/prdtool/settings" as const },
];

export function Shell({ children }: { children: ReactNode }) {
  const { settings } = useSettings();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 w-full border-b border-border bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-[1100px] items-center justify-between gap-4 px-5">
          <Link to="/tool/prdtool" className="flex flex-col rounded-lg leading-none">
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              You B Tech
            </span>
            <span className="mt-1 flex items-center gap-2">
              <span className="font-display text-lg font-bold tracking-tight text-foreground">VibePRD</span>
              <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                LOCAL-FIRST
              </span>
            </span>
          </Link>

          <nav
            aria-label="Main navigation"
            className="hidden items-center gap-1 rounded-full border border-border bg-muted/60 p-1 md:flex"
          >
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === "/tool/prdtool" }}
                className="rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                activeProps={{ className: "bg-primary-soft text-primary" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <a
            href={settings.toolsUrl || "#"}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 rounded-lg text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Tools
            <ArrowUpRight className="size-4" aria-hidden />
          </a>
        </div>
        <nav
          aria-label="Main navigation mobile"
          className="flex items-center gap-1 overflow-x-auto border-t border-border px-5 py-2 md:hidden"
        >
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/tool/prdtool" }}
              className="whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground"
              activeProps={{ className: "bg-primary-soft text-primary" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-[1100px] flex-1 px-5 py-10">{children}</main>
    </div>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("text-[11px] font-bold uppercase tracking-[0.14em] text-primary", className)}>{children}</p>
  );
}

export function Surface({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8", className)}>
      {children}
    </section>
  );
}
