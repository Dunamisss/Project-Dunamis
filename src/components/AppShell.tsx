import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/prompts", label: "Prompt Library" },
  { href: "/images", label: "Image Library" },
  { href: "/tutorials", label: "Tutorials" },
  { href: "/optimizer", label: "Optimizer" },
];

type AppShellProps = {
  title?: string;
  eyebrow?: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  accent?: "gold" | "slate";
};

export default function AppShell({
  title,
  eyebrow,
  description,
  children,
  actions,
  accent = "gold",
}: AppShellProps) {
  const [location] = useLocation();

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-black text-white">
      <div className="fixed inset-0 z-0 bg-[radial-gradient(circle_at_top,rgba(245,192,74,0.14),transparent_32%),radial-gradient(circle_at_80%_20%,rgba(120,119,198,0.12),transparent_24%),linear-gradient(180deg,#050505_0%,#090909_45%,#030303_100%)]" />
      <div className="fixed inset-x-0 top-0 z-0 h-40 bg-gradient-to-b from-yellow-400/6 to-transparent" />

      <div className="relative z-10">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-black/65 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <div className="flex items-center justify-between gap-4">
              <Link href="/" className="min-w-0">
                <div className="flex flex-col">
                  <span className="text-[11px] uppercase tracking-[0.38em] text-yellow-300/75">Dunamis</span>
                  <span className="text-lg font-semibold text-white">Creative Workspace</span>
                </div>
              </Link>
            </div>

            <nav className="flex flex-wrap gap-2">
              {NAV_ITEMS.map((item) => {
                const isActive = location === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm transition",
                      isActive
                        ? "border-yellow-400/50 bg-yellow-400/12 text-yellow-100"
                        : "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-yellow-400/30 hover:text-yellow-100",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8 lg:py-10">
          <section className="relative mb-8 overflow-hidden rounded-[32px] border border-yellow-500/18 bg-[linear-gradient(135deg,rgba(14,12,6,0.92),rgba(6,6,6,0.96))] px-6 py-8 shadow-[0_35px_110px_rgba(0,0,0,0.45)] lg:px-8 lg:py-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(245,192,74,0.18),transparent_24%),radial-gradient(circle_at_82%_24%,rgba(245,192,74,0.1),transparent_20%),linear-gradient(120deg,rgba(245,192,74,0.04),transparent_45%,rgba(255,255,255,0.02))]" />
            <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-4xl space-y-4">
                <p className="text-[11px] uppercase tracking-[0.38em] text-yellow-300/70">Dunamis Protocol</p>
                <div className="space-y-3">
                  <h1 className="dunamis-title text-5xl leading-none sm:text-6xl lg:text-8xl" data-text="DUNAMIS">
                    DUNAMIS
                  </h1>
                  <p className="text-lg italic text-yellow-200/90 lg:text-2xl">
                    "Precision prompts, zero noise - built for creators who ship."
                  </p>
                </div>
              </div>
              <p className="max-w-xl text-sm leading-7 text-zinc-300 lg:text-base">
                A cleaner creative workspace for building prompts, studying images, and tightening ideas without losing the identity of the project.
              </p>
            </div>
          </section>

          {(title || description || actions) && (
            <section
              className={cn(
                "mb-8 rounded-[28px] border p-6 shadow-[0_30px_90px_rgba(0,0,0,0.35)] lg:p-8",
                accent === "gold"
                  ? "border-yellow-400/18 bg-[linear-gradient(135deg,rgba(20,17,7,0.96),rgba(10,10,10,0.94))]"
                  : "border-white/10 bg-[linear-gradient(135deg,rgba(19,23,31,0.96),rgba(10,10,10,0.94))]",
              )}
            >
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl space-y-3">
                  {eyebrow && (
                    <p className="text-[11px] uppercase tracking-[0.38em] text-yellow-300/70">{eyebrow}</p>
                  )}
                  {title && <h1 className="text-3xl font-semibold text-white lg:text-5xl">{title}</h1>}
                  {description && <p className="max-w-2xl text-sm leading-6 text-zinc-300 lg:text-base">{description}</p>}
                </div>
                {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
              </div>
            </section>
          )}

          {children}
        </main>
      </div>
    </div>
  );
}
