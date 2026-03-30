"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Tv, Trophy, Zap, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/page-transition";

const features = [
  {
    icon: Tv,
    title: "Live ZTV",
    description: "Watch Zimbabwe Television live, anytime, anywhere.",
  },
  {
    icon: Trophy,
    title: "Sports Matches",
    description:
      "Stream football, cricket, and rugby matches with pay-per-view access.",
  },
  {
    icon: Zap,
    title: "Instant Access",
    description: "Pay with EcoCash or PayPal to unlock streams in seconds.",
  },
  {
    icon: Shield,
    title: "Secure Streams",
    description: "Token-authenticated HLS streams with adaptive bitrate.",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function HomePage() {
  return (
    <PageTransition>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/5" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8 lg:py-40">
          <div className="mx-auto max-w-2xl text-center">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl"
            >
              Stream Live from{" "}
              <span className="gradient-accent-text">Zimbabwe</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="mx-auto mt-6 max-w-lg text-lg text-muted-foreground"
            >
              Watch live sports matches and ZTV. Pay per match with EcoCash or
              PayPal — no subscriptions, no contracts.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-8 flex flex-wrap items-center justify-center gap-4"
            >
              <Button
                size="lg"
                className="gradient-accent border-0 px-6 text-white"
                asChild
              >
                <Link href="/sports">Browse Matches</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/live-tv">Watch ZTV Live</Link>
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold sm:text-3xl">
              Everything You Need to Watch
            </h2>
            <p className="mx-auto mt-3 max-w-md text-muted-foreground">
              Simple, affordable, and built for Zimbabwe.
            </p>
          </div>
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
          >
            {features.map((f) => (
              <motion.div
                key={f.title}
                variants={item}
                className="group rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/30"
              >
                <div className="gradient-accent mb-4 flex h-10 w-10 items-center justify-center rounded-lg">
                  <f.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {f.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border py-20">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold sm:text-3xl">
            Ready to Start Streaming?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">
            Create a free account and pay only for the matches you want to
            watch.
          </p>
          <div className="mt-8">
            <Button
              size="lg"
              className="gradient-accent border-0 px-8 text-white"
              asChild
            >
              <Link href="/register">Create Free Account</Link>
            </Button>
          </div>
        </div>
      </section>
    </PageTransition>
  );
}
