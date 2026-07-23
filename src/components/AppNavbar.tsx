"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/tests", label: "Tests" },
  { href: "/queue", label: "Queue status" },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNavbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isPublicSubmit = pathname.startsWith("/submit/");

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (isPublicSubmit) {
    return (
      <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--card)_92%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-4 md:px-8">
          <span className="brand-title">Aaptor</span>
          <span className="brand-sub ml-2">Project submit</span>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--card)_92%,transparent)] backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="group flex items-center gap-2.5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] font-[family-name:var(--font-display)] text-sm font-bold text-white">
              A
            </span>
            <span className="leading-tight">
              <span className="brand-title block">Aaptor</span>
              <span className="brand-sub block">VM To Model</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            {NAV_ITEMS.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-link rounded-lg px-3 py-2 transition-colors ${
                    active
                      ? "bg-teal-50 font-semibold text-[var(--accent-dark)]"
                      : "text-[var(--muted)] hover:bg-stone-100 hover:text-[var(--ink)]"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-1.5 rounded-full border border-[var(--line)] bg-white px-2.5 py-1 font-[family-name:var(--font-display)] text-[0.65rem] font-semibold tracking-[0.08em] uppercase text-[var(--muted)] sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
            Ops console
          </span>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--line)] bg-white md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="sr-only">Menu</span>
            <span className="flex w-4 flex-col gap-1">
              <span
                className={`h-0.5 w-full bg-[var(--ink)] transition ${open ? "translate-y-1.5 rotate-45" : ""}`}
              />
              <span
                className={`h-0.5 w-full bg-[var(--ink)] transition ${open ? "opacity-0" : ""}`}
              />
              <span
                className={`h-0.5 w-full bg-[var(--ink)] transition ${open ? "-translate-y-1.5 -rotate-45" : ""}`}
              />
            </span>
          </button>
        </div>
      </div>

      <div
        id="mobile-nav"
        className={`border-t border-[var(--line)] bg-[var(--card)] md:hidden ${open ? "block" : "hidden"}`}
      >
        <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3" aria-label="Mobile">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link rounded-lg px-3 py-2.5 ${
                  active
                    ? "bg-teal-50 font-semibold text-[var(--accent-dark)]"
                    : "text-[var(--muted)]"
                }`}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
