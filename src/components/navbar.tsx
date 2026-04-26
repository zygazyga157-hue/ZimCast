"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  LogOut,
  Tv,
  Trophy,
  Home,
  BarChart3,
  Shield,
  Radio,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProfileAvatar } from "@/components/profile-avatar";
import { useZimcastSocket } from "@/hooks/use-zimcast-socket";

const navLinks = [
  { href: "/", label: "Home", icon: Home },
  { href: "/live-tv", label: "Live TV", icon: Tv },
  { href: "/sports", label: "Sports", icon: Trophy },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

interface ProgramSummary {
  id: string;
  title: string;
  category: string;
  startTime: string;
  endTime: string;
  match?: { id: string; homeTeam: string; awayTeam: string } | null;
}

interface EpgSummary {
  channel: string;
  channelLabel: string;
  currentProgram: ProgramSummary | null;
  nextProgram: ProgramSummary | null;
  ztvAvailable: boolean;
  resumesAt: string | null;
  blackoutMatch: { id: string; homeTeam: string; awayTeam: string } | null;
}

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [epg, setEpg] = useState<EpgSummary | null>(null);
  const [epgLoaded, setEpgLoaded] = useState(false);
  const [insight, setInsight] = useState<string | null>(null);
  const [tickerIdx, setTickerIdx] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchSummary = async () => {
      try {
        const res = await fetch("/api/epg/summary");
        if (!res.ok) return;
        const data = (await res.json()) as EpgSummary;
        if (cancelled) return;
        setEpg(data);
        setEpgLoaded(true);
      } catch {
        // Silent fail — header should not break navigation.
      }
    };

    const initial = setTimeout(() => {
      void fetchSummary();
    }, 0);
    const interval = setInterval(() => {
      void fetchSummary();
    }, 30_000);

    return () => {
      cancelled = true;
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, []);

  // Real-time EPG updates via WebSocket
  useZimcastSocket("epg:update", (data) => {
    if (data && typeof data === "object") {
      setEpg(data as EpgSummary);
      setEpgLoaded(true);
    }
  });

  useEffect(() => {
    if (!session?.user?.id) return;
    let cancelled = false;

    const fetchInsight = async () => {
      try {
        const res = await fetch("/api/user/insight");
        if (!res.ok) return;
        const data = (await res.json()) as { message?: string | null };
        if (cancelled) return;
        setInsight(data.message ?? null);
      } catch {
        // Silent fail — insight is optional.
      }
    };

    const initial = setTimeout(() => {
      void fetchInsight();
    }, 0);
    const interval = setInterval(() => {
      void fetchInsight();
    }, 10 * 60_000);

    return () => {
      cancelled = true;
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, [session?.user?.id]);

  const currentTitle = epg?.currentProgram
    ? epg.currentProgram.match
      ? `${epg.currentProgram.match.homeTeam} vs ${epg.currentProgram.match.awayTeam}`
      : epg.currentProgram.title
    : null;

  const nextTitle = epg?.nextProgram
    ? epg.nextProgram.match
      ? `${epg.nextProgram.match.homeTeam} vs ${epg.nextProgram.match.awayTeam}`
      : epg.nextProgram.title
    : null;

  const resumesTime = epg?.resumesAt
    ? new Date(epg.resumesAt).toLocaleTimeString("en-ZW", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : null;

  // Build the list of items cycled on the mobile ticker
  const tickerItems = [
    currentTitle
      ? `${epg?.channelLabel ?? "ZTV"} — ${currentTitle}`
      : null,
    nextTitle ? `Up Next · ${nextTitle}` : null,
    !epg?.ztvAvailable && resumesTime ? `Resumes at ${resumesTime}` : null,
    session?.user?.id && insight ? insight : null,
  ].filter(Boolean) as string[];

  useEffect(() => {
    if (tickerItems.length <= 1) {
      const reset = setTimeout(() => setTickerIdx(0), 0);
      return () => clearTimeout(reset);
    }
    const t = setInterval(
      () => setTickerIdx((i) => (i + 1) % tickerItems.length),
      4500,
    );
    return () => clearInterval(t);
  }, [tickerItems.length]);

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="gradient-accent flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white">
            Z
          </div>
          <span className="text-lg font-bold tracking-tight">ZimCast</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="gradient-accent absolute inset-x-0 -bottom-2.25 h-0.5 rounded-full"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {session?.user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <ProfileAvatar
                    avatarUrl={(session.user as { avatarUrl?: string | null }).avatarUrl}
                    name={session.user.name}
                    email={session.user.email}
                    className="h-8 w-8"
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5 text-sm">
                  <p className="font-medium">{session.user.name ?? "User"}</p>
                  <p className="text-xs text-muted-foreground">
                    {session.user.email}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Profile & Passes
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/analytics" className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    My Analytics
                  </Link>
                </DropdownMenuItem>
                {(session.user as { role?: string }).role === "ADMIN" && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin" className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Admin Dashboard
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
              <Button
                size="sm"
                className="gradient-accent border-0 text-white hidden sm:inline-flex"
                asChild
              >
                <Link href="/register">Get Started</Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Context bar — Live EPG info */}
      {epgLoaded && (
        <div className="border-t border-border bg-background/60 px-4 py-2">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              {/* Status badge */}
              {epg?.ztvAvailable ? (
                <Badge
                  variant="outline"
                  className="shrink-0 border-red-500/30 bg-red-500/10 text-red-400"
                >
                  <Radio className="h-3 w-3 animate-pulse" />
                  LIVE NOW
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="shrink-0 border-amber-500/30 bg-amber-500/10 text-amber-400"
                >
                  BLACKOUT
                </Badge>
              )}

              {/* Mobile: cycling ticker — one item at a time, fades */}
              {tickerItems.length > 0 && (
                <div className="relative min-w-0 overflow-hidden md:hidden">
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={tickerIdx}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.25 }}
                      className="truncate text-sm"
                    >
                      {tickerItems[tickerIdx]}
                    </motion.p>
                  </AnimatePresence>
                </div>
              )}

              {/* Desktop (md+): static inline layout */}
              <div className="hidden min-w-0 items-center gap-2.5 md:flex">
                {currentTitle ? (
                  <p className="min-w-0 truncate text-sm">
                    <span className="font-semibold">
                      {epg?.channelLabel ?? "ZTV"}
                    </span>
                    <span className="text-muted-foreground"> — </span>
                    <span className="font-medium">{currentTitle}</span>
                  </p>
                ) : resumesTime ? (
                  <p className="text-sm text-amber-400">Resumes at {resumesTime}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Off air</p>
                )}
                {nextTitle && (
                  <span className="min-w-0 truncate text-xs text-muted-foreground">
                    Next · {nextTitle}
                  </span>
                )}
              </div>
            </div>

            {/* Personal insight — large screens only */}
            {session?.user?.id && insight && (
              <div className="hidden items-center text-xs text-muted-foreground lg:flex">
                <span className="max-w-85 truncate">{insight}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
