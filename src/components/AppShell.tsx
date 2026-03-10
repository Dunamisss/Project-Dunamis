import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { AuthModal } from "@/components/AuthModal";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/prompts", label: "Prompt Library" },
  { href: "/images", label: "Image Library" },
  { href: "/tutorials", label: "Tutorials" },
  { href: "/optimizer", label: "Optimizer" },
  { href: "/privacy", label: "Privacy" },
];

type AppShellProps = {
  title?: string;
  eyebrow?: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  accent?: "gold" | "slate";
  requireAuth?: boolean;
};

export default function AppShell({
  title,
  eyebrow,
  description,
  children,
  actions,
  accent = "gold",
  requireAuth = true,
}: AppShellProps) {
  const [location] = useLocation();
  const { user, logout, isLoading } = useAuth();
  const identityLabel = user?.displayName?.trim() || user?.email?.trim() || "Signed in";
  const isUnlocked = !requireAuth || Boolean(user);
  const heroActions = isUnlocked ? actions : (
    <AuthModal
      trigger={
        <Button className="bg-yellow-400 text-black hover:bg-yellow-300">
          Sign In To Continue
        </Button>
      }
    />
  );

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

            <div className="flex flex-col gap-3 lg:items-end">
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
              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                {user ? (
                  <>
                    <div className="rounded-full border border-yellow-500/25 bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-200">
                      {identityLabel}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-yellow-500/35 bg-transparent text-yellow-100 hover:bg-yellow-500/10"
                      onClick={() => {
                        void logout();
                      }}
                    >
                      Sign Out
                    </Button>
                  </>
                ) : (
                  <AuthModal
                    trigger={
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-yellow-500/35 bg-transparent text-yellow-100 hover:bg-yellow-500/10"
                      >
                        Sign In
                      </Button>
                    }
                  />
                )}
              </div>
            </div>
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
                    "Master the Art of the Prompt."
                  </p>
                </div>
              </div>
              <p className="max-w-xl text-sm leading-7 text-zinc-300 lg:text-base">
                Stop guessing. Start creating. Learn how to speak the language of AI and get results you actually want.
              </p>
            </div>
          </section>

          {(title || description || heroActions) && (
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
                {heroActions ? <div className="flex flex-wrap gap-3">{heroActions}</div> : null}
              </div>
            </section>
          )}

          {isLoading ? (
            <section className="rounded-[28px] border border-yellow-500/20 bg-black/50 p-8 text-center shadow-[0_30px_90px_rgba(0,0,0,0.35)]">
              <p className="text-[11px] uppercase tracking-[0.35em] text-yellow-300/70">Checking Session</p>
              <p className="mt-3 text-lg text-zinc-200">Loading your workspace access...</p>
            </section>
          ) : isUnlocked ? (
            children
          ) : (
            <section className="rounded-[28px] border border-yellow-500/20 bg-[linear-gradient(135deg,rgba(20,17,7,0.96),rgba(10,10,10,0.94))] p-8 shadow-[0_30px_90px_rgba(0,0,0,0.35)]">
              <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
                <p className="text-[11px] uppercase tracking-[0.35em] text-yellow-300/70">Protected Workspace</p>
                <h2 className="mt-3 text-3xl font-semibold text-white">Sign in before using Dunamis</h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-300 lg:text-base">
                  Tools, libraries, optimizer flows, and saved work are now locked until you authenticate. Browse the brand shell if you want, but usage starts after sign-in.
                </p>
                <div className="mt-6">
                  <AuthModal
                    trigger={
                      <Button className="bg-yellow-400 text-black hover:bg-yellow-300">
                        Open Sign In
                      </Button>
                    }
                  />
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
