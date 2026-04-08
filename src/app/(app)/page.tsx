"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Tv,
  Trophy,
  Shield,
  Smartphone,
  CreditCard,
  Play,
  ArrowRight,
  ChevronRight,
  Radio,
  User,
  Building2,
  Cpu,
  Server,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/page-transition";
import { MatchSimulation } from "@/components/match-simulation";

/* ---------- data ---------- */

interface LiveMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
}

const features = [
  {
    icon: Radio,
    title: "ZBC/ZTV Free Streaming",
    description:
      "Full free-to-air ZBC and ZTV access live on your phone. No antenna, no satellite. Just data and a profile.",
  },
  {
    icon: Trophy,
    title: "Zim Football Gateway",
    description:
      "Warriors, PSL, Dynamos derbies — a premium section with live matches and upcoming fixture calendars.",
  },
  {
    icon: CreditCard,
    title: "Pay-Per-Match Access",
    description:
      "Micro-payments per match via EcoCash or Paynow. No subscriptions, instant unlock.",
  },
  {
    icon: Smartphone,
    title: "Mobile First",
    description:
      "Adaptive bitrate streaming optimised for every screen size and connection speed.",
  },
  {
    icon: Shield,
    title: "Secure Streams",
    description:
      "Token-authenticated HLS with encrypted delivery — only verified users access paid streams.",
  },
  {
    icon: User,
    title: "Smart Profile",
    description:
      "One registration captures your preferences — powering your match history and pass tracking.",
  },
];

const steps = [
  {
    icon: Building2,
    title: "Source — ZBC Studios",
    description: "ZBC broadcasts their live signal from Pockets Hill, Harare.",
  },
  {
    icon: Cpu,
    title: "Encoder — Hardware Capture",
    description:
      "A hardware encoder converts the broadcast into HLS/DASH — the format mobile devices understand.",
  },
  {
    icon: Server,
    title: "Stream Server — ZimCast Backend",
    description:
      "The digital stream is secured by ZimCast's backend, handling token auth and pay-per-view access control.",
  },
  {
    icon: Play,
    title: "App — ZimCast",
    description:
      "Delivered live to your screen — in the resolution your data plan can handle.",
  },
];

const stats = [
  { value: "$2.99", label: "Per Match" },
  { value: "HD", label: "Stream Quality" },
  { value: "0s", label: "Signup Delay" },
  { value: "PSL", label: "+ Internationals" },
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
        const matches = data?.matches ?? data;
        if (Array.isArray(matches)) setLiveMatches(matches);
      })
      .catch(() => {});
  }, []);

  return (
    <PageTransition>
      {/* ===== HERO ===== */}
      <section className="hero-bg relative isolate overflow-hidden">
        {/* glow orbs */}
        <div className="hero-glow pointer-events-none absolute -left-40 -top-40 h-150 w-150 rounded-full bg-primary/20 blur-[120px]" />
        <div className="hero-glow pointer-events-none absolute -bottom-40 -right-40 h-125 w-125 rounded-full bg-accent/15 blur-[120px]" />

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-36">
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
                Zimbabwe&apos;s Premier Streaming Platform
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-7xl"
            >
              Live Football. Live TV.{" "}
              <span className="gradient-accent-text">One App.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground sm:text-xl"
            >
              Stream ZBC/ZTV free or unlock live Zimbabwe football
              match-by-match. Pay what makes sense, stream without breaking the
              bank.
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

      {/* ===== TICKER ===== */}
      <section className="border-y border-border bg-card/50 overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            {/* Fixed label */}
            {liveMatches.length > 0 ? (
              <span className="flex shrink-0 items-center gap-2 text-sm font-semibold text-primary">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                </span>
                LIVE NOW
              </span>
            ) : (
              <span className="flex shrink-0 items-center gap-2 text-sm font-semibold text-primary">
                ZIMCAST
              </span>
            )}
            <div className="h-4 w-px shrink-0 bg-border" />

            {/* Scrolling pills */}
            <div className="relative min-w-0 flex-1 overflow-hidden mask-[linear-gradient(to_right,transparent,black_4%,black_96%,transparent)]">
              <motion.div
                className="flex w-max items-center gap-4"
                animate={{ x: ["0%", "-50%"] }}
                transition={{
                  x: { duration: 20, repeat: Infinity, ease: "linear" },
                }}
              >
                {/* Render pills twice for seamless loop */}
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    {liveMatches.length > 0
                      ? liveMatches.map((m) => (
                          <Link
                            key={`${i}-${m.id}`}
                            href={`/sports/${m.id}`}
                            className="flex shrink-0 items-center gap-2 rounded-lg border border-border/50 bg-background/50 px-3 py-1.5 text-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
                          >
                            <span className="font-medium">{m.homeTeam}</span>
                            <span className="text-muted-foreground">vs</span>
                            <span className="font-medium">{m.awayTeam}</span>
                          </Link>
                        ))
                      : [
                          "Live Football",
                          "ZBC/ZTV Free",
                          "Pay-Per-Match",
                          "EcoCash & Paynow",
                          "PSL Matches",
                          "Warriors",
                        ].map((item) => (
                          <span
                            key={`${i}-${item}`}
                            className="shrink-0 rounded-lg border border-border/50 bg-background/50 px-3 py-1.5 text-sm text-muted-foreground"
                          >
                            {item}
                          </span>
                        ))}
                  </div>
                ))}
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== ZBC PARTNERSHIP STRIP ===== */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="border-y border-border bg-card/30"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-white p-1">
              <Image
                src="/zbc-logo.png"
                alt="Zimbabwe Broadcasting Corporation"
                width={48}
                height={48}
                className="h-10 w-auto"
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground/80">
                Zimbabwe Broadcasting Corp.
              </p>
              <p className="text-xs text-muted-foreground">
                Official Broadcast Signal Partner &middot; ZBC, Pockets Hill,
                Harare
              </p>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ===== MODE SPLIT ===== */}
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
              Two Platforms.{" "}
              <span className="gradient-accent-text">One App.</span>
            </motion.h2>
          </div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            className="mx-auto mt-14 grid max-w-3xl gap-6 sm:grid-cols-2"
          >
            {/* Football card */}
            <motion.div
              variants={fadeUp}
              className="rounded-xl border border-primary/30 bg-card p-6"
            >
              <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary">
                Premium
              </span>
              <h3 className="mt-4 text-xl font-bold tracking-tight">
                LIVE FOOTBALL
              </h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-bold">$2.99</span>
                <span className="text-sm text-muted-foreground">/ match</span>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Warriors AFCON qualifiers. PSL derbies. Dynamos vs Caps United
                &mdash; buy only the match you actually want.
              </p>
              <Button
                className="gradient-accent mt-6 w-full border-0 text-white"
                asChild
              >
                <Link href="/sports">Browse Matches</Link>
              </Button>
            </motion.div>

            {/* ZTV card */}
            <motion.div
              variants={fadeUp}
              className="rounded-xl border border-border bg-card p-6"
            >
              <span className="rounded-full border border-green-500/30 bg-green-500/10 px-3 py-0.5 text-xs font-medium text-green-500">
                Free to Air
              </span>
              <h3 className="mt-4 text-xl font-bold tracking-tight">
                ZBC/ZTV LIVE
              </h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-bold">Free</span>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                All ZBC/ZTV channels, live on your phone. News, entertainment,
                sport highlights &mdash; the full national broadcast.
              </p>
              <Button className="mt-6 w-full" variant="outline" asChild>
                <Link href="/live-tv">Watch ZTV Free</Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ===== FOOTBALL SECTION ===== */}
      <section className="border-t border-border bg-card/30 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Text */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Football Platform
              </span>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                Zimbabwe Football.{" "}
                <span className="gradient-accent-text">Live.</span>
              </h2>
              <p className="mt-4 max-w-lg text-muted-foreground">
                From Warriors AFCON qualifiers to PSL derbies, ZimCast&apos;s
                Football Gateway is built for fans who refuse to miss a minute
                &mdash; at a price that actually makes sense.
              </p>
              <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {stats.map((s, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-border bg-background/50 p-3 text-center"
                  >
                    <p className="text-xl font-bold">{s.value}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Pitch SVG */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex justify-center"
            >
              <MatchSimulation />
            </motion.div>
          </div>
        </div>
      </section>

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
              Built for{" "}
              <span className="gradient-accent-text">Zimbabwe.</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mx-auto mt-3 max-w-md text-muted-foreground"
            >
              Every feature designed around the realities of streaming in
              Zimbabwe — from data costs to payment methods.
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
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Technical Flow
            </span>
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="mt-3 text-2xl font-bold sm:text-3xl lg:text-4xl"
            >
              From Pockets Hill to Your{" "}
              <span className="gradient-accent-text">Palm.</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mx-auto mt-3 max-w-lg text-muted-foreground"
            >
              A four-step bridge that turns ZBC&apos;s broadcast into a
              mobile-ready stream, delivered to your phone wherever you are in
              Zimbabwe.
            </motion.p>
          </div>

          <div className="mt-16 grid gap-12 lg:grid-cols-2">
            {/* Steps */}
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-80px" }}
              className="space-y-6"
            >
              {steps.map((s, i) => (
                <motion.div
                  key={s.title}
                  variants={fadeUp}
                  className="flex items-start gap-4"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-primary/30 bg-background">
                    <span className="gradient-accent-text text-sm font-bold">
                      {i + 1}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold">{s.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {s.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Architecture cards */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col items-center gap-2"
            >
              {[
                {
                  icon: Building2,
                  label: "Source",
                  title: "ZBC Pockets Hill Studio",
                  highlight: false,
                },
                {
                  icon: Cpu,
                  label: "Encode",
                  title: "HLS / DASH Encoder",
                  highlight: false,
                },
                {
                  icon: Server,
                  label: "Distribute",
                  title: "ZimCast Stream Server",
                  highlight: false,
                },
                {
                  icon: Play,
                  label: "Deliver",
                  title: "ZimCast App",
                  highlight: true,
                },
              ].map((card, idx, arr) => (
                <div key={card.label} className="flex w-full max-w-xs flex-col items-center">
                  <div
                    className={`flex w-full items-center gap-3 rounded-lg border p-4 ${
                      card.highlight
                        ? "border-primary/30 bg-primary/5"
                        : "border-border bg-card"
                    }`}
                  >
                    <div className="gradient-accent flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
                      <card.icon className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">
                        {card.label}
                      </p>
                      <p
                        className={`text-sm font-semibold ${
                          card.highlight
                            ? "gradient-accent-text"
                            : "text-foreground"
                        }`}
                      >
                        {card.title}
                      </p>
                    </div>
                  </div>
                  {idx < arr.length - 1 && (
                    <span className="py-1 text-lg text-muted-foreground/40">
                      &#8595;
                    </span>
                  )}
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== PAYMENT STRIP ===== */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="border-y border-border bg-card/30"
      >
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-3 px-4 py-5 sm:flex-row sm:gap-6 sm:px-6 lg:px-8">
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Accepted Payment Methods
          </span>
          <div className="flex items-center gap-3">
            {["EcoCash", "Paynow"].map((method) => (
              <span
                key={method}
                className="rounded border border-border px-3 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
              >
                {method}
              </span>
            ))}
          </div>
        </div>
      </motion.section>

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
              Watch More, <span className="gradient-accent-text">Pay Less.</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mx-auto mt-3 max-w-lg text-muted-foreground"
            >
              No hefty subscriptions. Free ZTV or a $2.99 match pass &mdash;
              it&apos;s always your choice.
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
              <hr className="mt-4 border-border" />
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li>Live match stream (HD)</li>
                <li>Instant access at kick-off</li>
                <li>PSL &amp; Warriors matches</li>
                <li>EcoCash &amp; Paynow</li>
              </ul>
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
              <hr className="mt-4 border-border" />
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li>Live ZBC/ZTV stream</li>
                <li>News, entertainment &amp; sport</li>
                <li>Smart Profile system</li>
                <li>Always free</li>
              </ul>
              <Button className="mt-6 w-full" variant="outline" asChild>
                <Link href="/live-tv">Watch Now</Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="relative isolate overflow-hidden border-t border-border py-20 sm:py-28">
        <div className="hero-glow pointer-events-none absolute left-1/2 top-0 h-100 w-150 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[100px]" />
        <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-2xl font-bold sm:text-3xl lg:text-4xl"
          >
            Zimbabwe Watches Together.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mx-auto mt-4 max-w-md text-muted-foreground"
          >
            Free ZTV streaming. Live football on demand. One app built for every
            Zimbabwean with a phone and a love for their country.
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

      {/* ===== PAGE FOOTER TAGLINES ===== */}
      <section className="border-t border-border py-10">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Zimbabwe&apos;s Integrated Media &amp; Sports App
          </p>
          <p className="mt-2 text-xs text-muted-foreground/60">
            Powered by ZBC Signal &middot; Pockets Hill, Harare
          </p>
        </div>
      </section>
    </PageTransition>
  );
}
