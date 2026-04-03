"use client";

import { useEffect, useState, use } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  Radio,
  Loader2,
  ArrowLeft,
  Smartphone,
  CreditCard,
  CheckCircle2,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PageTransition } from "@/components/page-transition";
import { api, showApiError } from "@/lib/api";
import type { MatchPhase } from "@/lib/match-window";

interface ZplsScore {
  score: string;
  ht_score: string;
  ft_score: string;
  status: string;
  time: string;
  home_logo: string;
  away_logo: string;
}

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  kickoff: string;
  price: string;
  isLive: boolean;
  streamKey: string;
  phase?: MatchPhase;
  passStart?: string;
  passEnd?: string;
  phaseEndsAt?: string;
  zpls?: ZplsScore | null;
}

type PaymentStep = "details" | "paying" | "polling" | "success" | "error";

function getInitials(team: string): string {
  const words = team.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.map((w) => w[0]).join("").slice(0, 3).toUpperCase();
}

export default function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session } = useSession();
  const router = useRouter();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasPass, setHasPass] = useState(false);

  // Payment state
  const [provider, setProvider] = useState<"ECOCASH" | "PAYNOW">("ECOCASH");
  const [phone, setPhone] = useState("");
  const [paymentStep, setPaymentStep] = useState<PaymentStep>("details");
  const [paymentError, setPaymentError] = useState("");

  // Countdown state (must be declared unconditionally)
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    if (!match) return;
    const phase = match.phase;
    if (phase === "LIVE" || phase === "POSTGAME" || phase === "ENDED") return;
    const target = phase === "PREGAME"
      ? new Date(match.kickoff).getTime()
      : match.passStart
        ? new Date(match.passStart).getTime()
        : new Date(match.kickoff).getTime();
    const update = () => {
      const diff = target - Date.now();
      if (diff <= 0) { setCountdown("Starting now"); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (d > 0) setCountdown(`${d}d ${h}h ${m}m`);
      else if (h > 0) setCountdown(`${h}h ${m}m ${s}s`);
      else setCountdown(`${m}m ${s}s`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [match]);

  useEffect(() => {
    Promise.all([
      api<Match>(`/api/matches/${id}`),
      session
        ? api<Array<{ matchId: string; expiresAt: string; passStart: string; passEnd: string; passState: string }>>("/api/user/passes")
        : Promise.resolve([]),
    ])
      .then(([matchData, passesData]) => {
        setMatch(matchData);
        const passes = passesData ?? [];
        setHasPass(
          passes.some(
            (p) =>
              p.matchId === id && new Date(p.passEnd ?? p.expiresAt) > new Date()
          )
        );
      })
      .catch((err) => showApiError(err, "Failed to load match"))
      .finally(() => setLoading(false));
  }, [id, session]);

  async function handlePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!session) {
      router.push("/login");
      return;
    }

    setPaymentStep("paying");
    setPaymentError("");

    try {
      const body: Record<string, string> = {
        matchId: id,
        provider,
      };
      if (provider === "ECOCASH") {
        body.phone = phone;
      }

      const data = await api<{ paymentId?: string; redirectUrl?: string }>(
        "/api/payments/initiate",
        { method: "POST", body }
      );

      if (data.redirectUrl) {
        // Paynow web — redirect to Paynow payment page
        window.location.assign(data.redirectUrl);
        return;
      }

      // EcoCash — poll for completion
      setPaymentStep("polling");
      await pollPayment(data.paymentId!);
    } catch (err) {
      setPaymentError(
        err instanceof Error ? err.message : "Payment failed"
      );
      setPaymentStep("error");
    }
  }

  async function pollPayment(paymentId: string) {
    const maxAttempts = 30;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      try {
        const data = await api<{ status: string; hasAccess?: boolean }>(`/api/payments/poll/${paymentId}`);

        if (data.status === "COMPLETED" || data.hasAccess) {
          setPaymentStep("success");
          setHasPass(true);
          return;
        }
        if (data.status === "FAILED") {
          setPaymentError("Payment was declined. Please try again.");
          setPaymentStep("error");
          return;
        }
      } catch {
        // continue polling
      }
    }
    // Polling exhausted — do one final pass check via the passes endpoint
    // in case the payment completed via webhook while we were waiting
    try {
      const passes = await api<Array<{ matchId: string }>>("/api/user/passes");
      if (match && passes.some((p) => p.matchId === match.id)) {
        setPaymentStep("success");
        setHasPass(true);
        return;
      }
    } catch {
      // ignore
    }
    setPaymentError("Payment timed out. Please check your passes or contact support.");
    setPaymentStep("error");
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Match not found.</p>
        <Button variant="outline" asChild>
          <Link href="/sports">Back to Sports</Link>
        </Button>
      </div>
    );
  }

  const kickoff = new Date(match.kickoff);

  return (
    <PageTransition>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/sports"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Sports
        </Link>

        {/* Match Hero Header */}
        <div className="relative overflow-hidden rounded-xl border border-border">
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a0a12] via-card to-[#120a1a]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,65,108,0.12),transparent_60%)]" />

          <div className="relative px-6 py-8 sm:px-10 sm:py-10">
            {/* Status badge */}
            <div className="mb-6 flex justify-center">
              {match.phase === "LIVE" || match.phase === "POSTGAME" ? (
                <Badge className="border-red-500/30 bg-red-500/10 text-red-400 text-sm px-4 py-1">
                  <Radio className="mr-1.5 h-3.5 w-3.5 animate-pulse" />
                  {match.phase === "POSTGAME" ? "POST-MATCH" : "LIVE NOW"}
                </Badge>
              ) : match.phase === "PREGAME" ? (
                <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-400 text-sm px-4 py-1">
                  STARTING SOON
                </Badge>
              ) : match.phase === "ENDED" ? (
                <Badge className="border-muted-foreground/30 bg-muted/30 text-muted-foreground text-sm px-4 py-1">
                  MATCH ENDED
                </Badge>
              ) : (
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {kickoff.toLocaleDateString("en-ZW", {
                      weekday: "short", month: "short", day: "numeric",
                    })}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {kickoff.toLocaleTimeString("en-ZW", {
                      hour: "2-digit", minute: "2-digit", hour12: false,
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* Teams VS */}
            <div className="flex items-center justify-center gap-6 sm:gap-10">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="flex flex-col items-center gap-3"
              >
                {match.zpls?.home_logo ? (
                  <Image
                    src={match.zpls.home_logo}
                    alt={match.homeTeam}
                    width={80}
                    height={80}
                    className="h-16 w-16 rounded-full object-contain sm:h-20 sm:w-20"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary/30 bg-primary/10 text-lg font-bold text-primary sm:h-20 sm:w-20 sm:text-xl">
                    {getInitials(match.homeTeam)}
                  </div>
                )}
                <p className="max-w-[120px] text-center text-sm font-semibold sm:text-base">
                  {match.homeTeam}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                {match.zpls?.score ? (
                  <div className="flex flex-col items-center">
                    <span className="text-2xl font-black tabular-nums sm:text-3xl">{match.zpls.score}</span>
                    {(match.zpls.status === "IN PLAY" || match.zpls.status === "HALF TIME BREAK" || match.zpls.status === "ADDED TIME") && (
                      <span className="text-xs font-medium text-red-400 animate-pulse">{match.zpls.time}&apos;</span>
                    )}
                    {match.zpls.ht_score && (
                      <span className="text-[10px] text-muted-foreground mt-1">HT: {match.zpls.ht_score}</span>
                    )}
                  </div>
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full gradient-accent text-sm font-black text-white shadow-lg shadow-primary/20">
                    VS
                  </div>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="flex flex-col items-center gap-3"
              >
                {match.zpls?.away_logo ? (
                  <Image
                    src={match.zpls.away_logo}
                    alt={match.awayTeam}
                    width={80}
                    height={80}
                    className="h-16 w-16 rounded-full object-contain sm:h-20 sm:w-20"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-accent/30 bg-accent/10 text-lg font-bold text-accent sm:h-20 sm:w-20 sm:text-xl">
                    {getInitials(match.awayTeam)}
                  </div>
                )}
                <p className="max-w-[120px] text-center text-sm font-semibold sm:text-base">
                  {match.awayTeam}
                </p>
              </motion.div>
            </div>

            {/* Countdown or Price */}
            {match.phase !== "ENDED" && !["LIVE", "POSTGAME"].includes(match.phase ?? "") && countdown && (
              <div className="mt-5 flex items-center justify-center gap-2 text-sm font-medium text-primary">
                <Timer className="h-4 w-4" />
                {match.phase === "PREGAME" ? `Kickoff in ${countdown}` : `Starts in ${countdown}`}
              </div>
            )}
          </div>
        </div>

        {/* Access / Payment */}
        <div className="mt-6 rounded-xl border border-border bg-card p-6">
          {match.phase === "ENDED" && !hasPass ? (
            <div className="text-center py-4">
              <h2 className="text-lg font-semibold">Match Ended</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                This match has ended. Browse other matches below.
              </p>
              <Button className="mt-6" variant="outline" asChild>
                <Link href="/sports">Browse Matches</Link>
              </Button>
            </div>
          ) : hasPass ? (
            (() => {
              const passStart = match.passStart ? new Date(match.passStart) : null;
              const passEnd = match.passEnd ? new Date(match.passEnd) : null;
              const now = Date.now();
              const isBeforeWindow = passStart && now < passStart.getTime();
              const isExpired = passEnd && now >= passEnd.getTime();

              if (isExpired) {
                return (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-4"
                  >
                    <Badge className="border-muted-foreground/30 bg-muted/30 text-muted-foreground mb-4">
                      EXPIRED
                    </Badge>
                    <h2 className="text-xl font-bold">Pass Expired</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Your match pass has expired.
                    </p>
                    <Button className="mt-6" variant="outline" asChild>
                      <Link href="/sports">Browse Matches</Link>
                    </Button>
                  </motion.div>
                );
              }

              if (isBeforeWindow) {
                return (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-4"
                  >
                    <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
                    <h2 className="mt-4 text-xl font-bold">Pass Purchased</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Available at{" "}
                      <span className="font-medium text-foreground">
                        {passStart!.toLocaleTimeString("en-ZW", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        })}
                      </span>{" "}
                      (15 min before kickoff).
                    </p>
                    <Button
                      className="gradient-accent mt-6 border-0 px-8 text-white opacity-50 cursor-not-allowed"
                      disabled
                    >
                      Watch Now
                    </Button>
                  </motion.div>
                );
              }

              return (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-4"
                >
                  <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
                  <h2 className="mt-4 text-xl font-bold">You Have Access!</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Your match pass is active. Start watching now.
                  </p>
                  <Button
                    className="gradient-accent mt-6 border-0 px-8 text-white"
                    asChild
                  >
                    <Link href={`/watch/${match.id}`}>Watch Now</Link>
                  </Button>
                </motion.div>
              );
            })()
          ) : paymentStep === "success" ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4"
            >
              <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
              <h2 className="mt-4 text-xl font-bold">Payment Successful!</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Your match pass has been activated.
              </p>
              <Button
                className="gradient-accent mt-6 border-0 px-8 text-white"
                asChild
              >
                <Link href={`/watch/${match.id}`}>Watch Now</Link>
              </Button>
            </motion.div>
          ) : paymentStep === "polling" ? (
            <div className="py-10 text-center">
              <div className="relative mx-auto mb-6 h-16 w-16">
                <Loader2 className="h-16 w-16 animate-spin text-primary/30" />
                <Loader2 className="absolute inset-0 h-16 w-16 animate-spin text-primary [animation-duration:1.5s]" style={{ clipPath: "inset(0 50% 0 0)" }} />
              </div>
              <h2 className="text-lg font-semibold">Waiting for Payment</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Please confirm the payment on your phone. This may take a
                moment…
              </p>
            </div>
          ) : paymentStep === "error" ? (
            <div className="text-center py-4">
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-4 text-sm text-destructive mb-6">
                {paymentError}
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                {paymentError.includes("timed out") && (
                  <Button
                    onClick={async () => {
                      try {
                        const passes = await api<Array<{ matchId: string }>>("/api/user/passes");
                        if (passes.some((p) => p.matchId === match.id)) {
                          setPaymentStep("success");
                          setHasPass(true);
                          setPaymentError("");
                          return;
                        }
                      } catch {
                        // ignore
                      }
                      setPaymentError("No active pass found yet. Please wait a moment and try again.");
                    }}
                    variant="outline"
                  >
                    Check Access
                  </Button>
                )}
                <Button
                  onClick={() => {
                    setPaymentStep("details");
                    setPaymentError("");
                  }}
                  className="gradient-accent border-0 text-white"
                >
                  Try Again
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/sports">Back to Sports</Link>
                </Button>
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold">Get Match Pass</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Pay <span className="font-semibold text-foreground">${match.price}</span>{" "}
                to unlock this match stream.
              </p>

              <Separator className="my-5" />

              {/* Provider selection */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setProvider("ECOCASH")}
                  className={`flex items-center gap-2.5 rounded-lg border p-3.5 text-left text-sm font-medium transition-all ${
                    provider === "ECOCASH"
                      ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/30"
                      : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  }`}
                >
                  <Smartphone className="h-5 w-5 shrink-0" />
                  <span>
                    <span className="block">EcoCash</span>
                    <span className="block text-xs font-normal text-muted-foreground">Mobile money</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setProvider("PAYNOW")}
                  className={`flex items-center gap-2.5 rounded-lg border p-3.5 text-left text-sm font-medium transition-all ${
                    provider === "PAYNOW"
                      ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/30"
                      : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  }`}
                >
                  <CreditCard className="h-5 w-5 shrink-0" />
                  <span>
                    <span className="block">Paynow</span>
                    <span className="block text-xs font-normal text-muted-foreground">Visa / Mastercard</span>
                  </span>
                </button>
              </div>

              <form onSubmit={handlePayment} className="mt-5 space-y-4">
                {provider === "ECOCASH" && (
                  <div className="space-y-2">
                    <Label htmlFor="phone">EcoCash Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="07XXXXXXXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      pattern="07\d{8}"
                      title="Enter a valid Zimbabwean phone number (07XXXXXXXX)"
                    />
                    <p className="text-xs text-muted-foreground">
                      You will receive a USSD prompt to confirm.
                    </p>
                  </div>
                )}

                {provider === "PAYNOW" && (
                  <p className="rounded-lg border border-border bg-secondary/30 px-4 py-3 text-sm text-muted-foreground">
                    You will be redirected to Paynow to complete payment securely.
                  </p>
                )}

                {!session ? (
                  <Button
                    type="button"
                    className="gradient-accent w-full border-0 text-white"
                    onClick={() => router.push("/login")}
                  >
                    Sign In to Purchase
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={paymentStep === "paying"}
                    className="gradient-accent w-full border-0 text-white"
                  >
                    {paymentStep === "paying" ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing…
                      </>
                    ) : (
                      `Pay $${match.price} with ${provider === "ECOCASH" ? "EcoCash" : "Paynow"}`
                    )}
                  </Button>
                )}
              </form>
            </>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
