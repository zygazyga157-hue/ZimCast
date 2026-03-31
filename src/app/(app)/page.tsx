"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Tv,
  Trophy,
  Zap,
  Shield,
  Smartphone,
  CalendarDays,
  UserPlus,
  CreditCard,
  Play,
  Star,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/page-transition";

/* ---------- data ---------- */

interface LiveMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
}

const features = [
  {
    icon: Tv,
    title: "Live ZTV",
    description: "Watch Zimbabwe Television live, anytime, anywhere on any device.",
  },
  {
    icon: Trophy,
    title: "Sports",
    description: "Football, cricket, rugby — stream every match as it happens.",
  },
  {
    icon: CreditCard,
    title: "Pay-Per-View",
    description: "Only pay for what you watch. No subscriptions, no commitment.",
  },
  {
    icon: Smartphone,
    title: "Mobile First",
    description: "Optimised for mobile with adaptive bitrate streaming.",
  },
  {
    icon: Shield,
    title: "Secure Streams",
    description: "Token-authenticated HLS with encrypted delivery.",
  },
  {
    icon: CalendarDays,
    title: "EPG Guide",
    description: "Full programme schedule so you never miss what matters.",
  },
];

const steps = [
  {
    icon: UserPlus,
    title: "Create Account",
    description: "Sign up in seconds — free forever.",
  },
  {
    icon: CreditCard,
    title: "Pay for a Match",
    description: "Use EcoCash or PayPal. Instant unlock.",
  },
  {
    icon: Play,
    title: "Start Watching",
    description: "HD streams ready on any device.",
  },
];

const testimonials = [
  {
    name: "Tatenda M.",
    location: "Harare",
    quote:
      "I can finally watch Warriors matches from work without dodgy links. ZimCast is a game-changer!",
    stars: 5,
  },
  {
    name: "Rudo K.",
    location: "Bulawayo",
    quote:
      "The EcoCash integration is seamless — I paid once and was streaming in under 10 seconds.",
    stars: 5,
  },
  {
    name: "Tinotenda C.",
    location: "Mutare",
    quote:
      "Love that there are no subscriptions. I only pay when there is a match I actually want to watch.",
    stars: 4,
  },
];

const stats = [
  { value: "10K+", label: "Users" },
  { value: "50+", label: "Matches" },
  { value: "24/7", label: "Live TV" },
];

/* ---------- animation variants ---------- */

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

/* ---------- component ---------- */

export default function HomePage() {
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([]);

  useEffect(() => {
    fetch("/api/matches?status=live")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setLiveMatches(data);
      })
      .catch(() => {});
  }, []);

  return (
    <PageTransition>
      {/* ===== HERO ===== */}
      <section className="hero-bg relative isolate overflow-hidden">
        {/* glow orbs */}
        <div className="hero-glow pointer-events-none absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full bg-primary/20 blur-[120px]" />
        <div className="hero-glow pointer-events-none absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-accent/15 blur-[120px]" />

        <div className="relative mx-auto max-w-7xl px-4 py-28 sm:px-6 sm:py-36 lg:px-8 lg:py-44">
          <div className="mx-auto max-w-3xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-xs font-medium text-primary">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </span>
                Now Streaming
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-7xl"
            >
              Stream Live from{" "}
              <span className="gradient-accent-text">Zimbabwe</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground sm:text-xl"
            >
              Watch live sports matches and ZTV. Pay per match with EcoCash or
              PayPal — no subscriptions, no contracts.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-10 flex flex-wrap items-center justify-center gap-4"
            >
              <Button
                size="lg"
                className="gradient-accent border-0 px-8 text-white shadow-lg shadow-primary/25"
                asChild
              >
                <Link href="/sports">
                  Browse Matches <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="group" asChild>
                <Link href="/live-tv">
                  Watch ZTV Live
                  <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
            </motion.div>

            {/* stats row */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mt-14 flex items-center justify-center gap-8 sm:gap-14"
            >
              {stats.map((s, i) => (
                <div key={i} className="text-center">
                  <p className="text-2xl font-bold sm:text-3xl">{s.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                    {s.label}
                  </p>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== LIVE NOW TICKER ===== */}
      {liveMatches.length > 0 && (
        <section className="border-y border-border bg-card/50">
          <div className="mx-auto flex max-w-7xl items-center gap-4 overflow-x-auto px-4 py-3 sm:px-6 lg:px-8">
            <span className="flex shrink-0 items-center gap-2 text-sm font-semibold text-primary">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
              LIVE NOW
            </span>
            <div className="h-4 w-px bg-border" />
            {liveMatches.map((m) => (
              <Link
                key={m.id}
                href={`/sports/${m.id}`}
                className="flex shrink-0 items-center gap-2 rounded-lg border border-border/50 bg-background/50 px-3 py-1.5 text-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <span className="font-medium">{m.homeTeam}</span>
                <span className="text-muted-foreground">vs</span>
                <span className="font-medium">{m.awayTeam}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ===== FEATURES ===== */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-2xl font-bold sm:text-3xl lg:text-4xl"
            >
              Everything You Need to Watch
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mx-auto mt-3 max-w-md text-muted-foreground"
            >
              Simple, affordable, and built for Zimbabwe.
            </motion.p>
          </div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {features.map((f) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/30"
              >
                {/* hover glow */}
                <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-primary/5 opacity-0 blur-2xl transition-opacity group-hover:opacity-100" />
                <div className="relative">
                  <div className="gradient-accent mb-4 flex h-11 w-11 items-center justify-center rounded-lg">
                    <f.icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {f.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="border-t border-border bg-card/30 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-2xl font-bold sm:text-3xl lg:text-4xl"
            >
              Get Started in 3 Steps
            </motion.h2>
          </div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            className="relative mt-16 grid gap-8 sm:grid-cols-3"
          >
            {/* connecting line (desktop) */}
            <div className="pointer-events-none absolute left-[16.7%] right-[16.7%] top-10 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent sm:block" />

            {steps.map((s, i) => (
              <motion.div
                key={s.title}
                variants={fadeUp}
                className="relative flex flex-col items-center text-center"
              >
                <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full border-2 border-primary/30 bg-background">
                  <span className="gradient-accent-text text-2xl font-bold">
                    {i + 1}
                  </span>
                </div>
                <div className="gradient-accent mt-4 flex h-10 w-10 items-center justify-center rounded-lg">
                  <s.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 max-w-[240px] text-sm text-muted-foreground">
                  {s.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section className="border-t border-border py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-2xl font-bold sm:text-3xl lg:text-4xl"
            >
              Loved by Zimbabweans
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mx-auto mt-3 max-w-md text-muted-foreground"
            >
              See what our viewers have to say.
            </motion.p>
          </div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {testimonials.map((t) => (
              <motion.div
                key={t.name}
                variants={fadeUp}
                className="rounded-xl border border-border bg-card p-6"
              >
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < t.stars
                          ? "fill-yellow-500 text-yellow-500"
                          : "text-border"
                      }`}
                    />
                  ))}
                </div>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="mt-4 border-t border-border pt-4">
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.location}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ===== PRICING PREVIEW ===== */}
      <section className="border-t border-border bg-card/30 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-2xl font-bold sm:text-3xl lg:text-4xl"
            >
              No Subscriptions. Ever.
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mx-auto mt-3 max-w-lg text-muted-foreground"
            >
              Pay only for the matches you want. ZTV is always free.
            </motion.p>
          </div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            className="mx-auto mt-14 grid max-w-3xl gap-6 sm:grid-cols-2"
          >
            {/* Match card */}
            <motion.div
              variants={fadeUp}
              className="rounded-xl border border-primary/30 bg-card p-6"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-primary">
                  PAY-PER-VIEW
                </span>
                <Trophy className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">Sports Match</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Access any live or upcoming match
              </p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-3xl font-bold">$2.99</span>
                <span className="text-sm text-muted-foreground">USD</span>
                <span className="mx-1 text-muted-foreground">/</span>
                <span className="text-xl font-semibold">15 ZiG</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">per match</p>
              <Button
                className="gradient-accent mt-6 w-full border-0 text-white"
                asChild
              >
                <Link href="/sports">Browse Matches</Link>
              </Button>
            </motion.div>

            {/* Free ZTV card */}
            <motion.div
              variants={fadeUp}
              className="rounded-xl border border-border bg-card p-6"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-green-500">
                  ALWAYS FREE
                </span>
                <Tv className="h-5 w-5 text-green-500" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">Live ZTV</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Zimbabwe Television — news, shows, and more
              </p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-3xl font-bold">Free</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                no account required
              </p>
              <Button className="mt-6 w-full" variant="outline" asChild>
                <Link href="/live-tv">Watch Now</Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="relative isolate overflow-hidden border-t border-border py-20 sm:py-28">
        <div className="hero-glow pointer-events-none absolute left-1/2 top-0 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[100px]" />
        <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-2xl font-bold sm:text-3xl lg:text-4xl"
          >
            Ready to Start Streaming?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mx-auto mt-4 max-w-md text-muted-foreground"
          >
            Create a free account and pay only for the matches you want to
            watch.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-8"
          >
            <Button
              size="lg"
              className="gradient-accent border-0 px-8 text-white shadow-lg shadow-primary/25"
              asChild
            >
              <Link href="/register">
                Create Free Account <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>
    </PageTransition>
  );
}
