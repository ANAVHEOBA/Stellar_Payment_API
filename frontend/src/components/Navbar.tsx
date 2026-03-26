"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useHydrateMerchantStore } from "@/lib/merchant-store";

type AppNavLink = {
  href: string;
  label: string;
};

type DashboardNavLink = {
  href: string;
  label: string;
  icon: (active: boolean) => JSX.Element;
  enabled: boolean;
};

function CreateIcon(active: boolean) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-5 w-5 ${active ? "text-mint" : "text-slate-400"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

function OverviewIcon(active: boolean) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-5 w-5 ${active ? "text-mint" : "text-slate-400"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        d="M4 5.5h16M4 12h16M4 18.5h16"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 8.5h4M13 8.5h4M7 15h4M13 15h4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PaymentsIcon(active: boolean) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-5 w-5 ${active ? "text-mint" : "text-slate-400"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <rect
        x="3.5"
        y="5.5"
        width="17"
        height="13"
        rx="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 14h4M7 10h10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WebhooksIcon(active: boolean) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-5 w-5 ${active ? "text-mint" : "text-slate-400"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        d="M9 7.5a4 4 0 1 1 6.8 2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15 16.5a4 4 0 1 1-6.8-2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 14 15.5 10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="14.5" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="16" cy="9.5" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

const appNavLinks: AppNavLink[] = [
  { href: "/", label: "Home" },
  { href: "/dashboard/create", label: "Create Payment" },
  { href: "/settings", label: "Settings" },
  { href: "/register", label: "Register" },
];

// Add future dashboard routes here and set `enabled: true` when the page exists.
const dashboardMobileNavLinks: DashboardNavLink[] = [
  {
    href: "/dashboard/overview",
    label: "Overview",
    icon: OverviewIcon,
    enabled: true,
  },
  {
    href: "/dashboard/payments",
    label: "Payments",
    icon: PaymentsIcon,
    enabled: true,
  },
  {
    href: "/dashboard/webhooks",
    label: "Webhooks",
    icon: WebhooksIcon,
    enabled: true,
  },
  {
    href: "/dashboard/create",
    label: "Create",
    icon: CreateIcon,
    enabled: true,
  },
];

export default function Navbar() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const activeDashboardMobileNavLinks = dashboardMobileNavLinks.filter(
    (link) => link.enabled,
  );
  const showMobileBottomNav = activeDashboardMobileNavLinks.some((link) =>
    isActive(pathname, link.href),
  );

  useHydrateMerchantStore();

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.classList.toggle("dashboard-mobile-nav", showMobileBottomNav);

    return () => {
      document.body.classList.remove("dashboard-mobile-nav");
    };
  }, [showMobileBottomNav]);

  return (
    <>
      <nav className="border-b border-white/10 bg-black/50 backdrop-blur dark:border-white/10 dark:bg-black/50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex h-16 items-center justify-between">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-2">
                <span className="font-mono text-sm uppercase tracking-[0.3em] text-mint">
                  Stellar Pay
                </span>
              </Link>

              {/* Desktop Navigation */}
              <div className="hidden items-center gap-8 md:flex">
                {appNavLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={isActive(pathname, link.href) ? "page" : undefined}
                    className={`text-sm transition-colors ${
                      isActive(pathname, link.href)
                        ? "text-white"
                        : "text-slate-300 hover:text-white"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>

              {!showMobileBottomNav && (
                <button
                  type="button"
                  onClick={() => setIsMenuOpen((open) => !open)}
                  className="flex flex-col gap-1.5 md:hidden"
                  aria-label="Toggle menu"
                >
                  <span
                    className={`block h-0.5 w-6 bg-white transition-all ${
                      isMenuOpen ? "translate-y-2 rotate-45" : ""
                    }`}
                  ></span>
                  <span
                    className={`block h-0.5 w-6 bg-white transition-all ${
                      isMenuOpen ? "opacity-0" : ""
                    }`}
                  ></span>
                  <span
                    className={`block h-0.5 w-6 bg-white transition-all ${
                      isMenuOpen ? "-translate-y-2 -rotate-45" : ""
                    }`}
                  ></span>
                </button>
              )}
            </div>
          </div>
          {!showMobileBottomNav && isMenuOpen && (
            <div className="border-t border-white/10 py-4 md:hidden">
              <div className="flex flex-col gap-4">
                {appNavLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-sm text-slate-300 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          )}
      </nav>

      {showMobileBottomNav && (
        <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-black/85 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur md:hidden">
          <div
            className="mx-auto grid max-w-md gap-2 px-4"
            style={{
              gridTemplateColumns: `repeat(${activeDashboardMobileNavLinks.length}, minmax(0, 1fr))`,
            }}
          >
            {activeDashboardMobileNavLinks.map((link) => {
              const active = isActive(pathname, link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-label={link.label}
                  aria-current={active ? "page" : undefined}
                  className={`group relative flex min-h-14 items-center justify-center rounded-2xl border transition-all ${
                    active
                      ? "border-mint/40 bg-mint/10 shadow-[0_0_20px_rgba(94,242,192,0.12)]"
                      : "border-white/5 bg-white/[0.03] hover:border-white/10 hover:bg-white/[0.06]"
                  }`}
                >
                  <span className="pointer-events-none absolute -top-8 rounded-full border border-white/10 bg-slate-950/95 px-2 py-1 text-[10px] font-medium text-white opacity-0 shadow-lg transition-all duration-200 group-hover:-translate-y-1 group-hover:opacity-100 group-focus-visible:-translate-y-1 group-focus-visible:opacity-100">
                    {link.label}
                  </span>
                  {link.icon(active)}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
}
