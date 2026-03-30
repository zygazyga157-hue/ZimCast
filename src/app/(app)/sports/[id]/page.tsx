"use client";

import { useEffect, useState, use } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PageTransition } from "@/components/page-transition";

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  kickoff: string;
  price: string;
  isLive: boolean;
  streamKey: string;
}

type PaymentStep = "details" | "paying" | "polling" | "success" | "error";

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
  const [provider, setProvider] = useState<"ECOCASH" | "PAYPAL">("ECOCASH");
  const [phone, setPhone] = useState("");
  const [paymentStep, setPaymentStep] = useState<PaymentStep>("details");
  const [paymentError, setPaymentError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`/api/matches/${id}`).then((r) => r.json()),
      session
        ? fetch("/api/user/passes").then((r) => r.json())
        : Promise.resolve([]),
    ])
      .then(([matchData, passesData]) => {
        setMatch(matchData);
        const passes = passesData.passes ?? passesData ?? [];
        setHasPass(
          passes.some(
            (p: { matchId: string; expiresAt: string }) =>
              p.matchId === id && new Date(p.expiresAt) > new Date()
          )
        );
      })
      .catch(() => {})
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

      const res = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Payment initiation failed");
      }

      const data = await res.json();

      if (data.redirectUrl) {
        // PayPal — redirect to payment page
        window.location.href = data.redirectUrl;
        return;
      }

      // EcoCash — poll for completion
      setPaymentStep("polling");
      await pollPayment(data.paymentId);
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
        const res = await fetch(`/api/payments/poll/${paymentId}`);
        const data = await res.json();

        if (data.status === "COMPLETED") {
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
    setPaymentError("Payment timed out. Check your transaction history.");
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

        {/* Match Info */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                {match.homeTeam} vs {match.awayTeam}
              </h1>
              <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {kickoff.toLocaleDateString("en-ZW", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {kickoff.toLocaleTimeString("en-ZW", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
            {match.isLive && (
              <Badge
                variant="outline"
                className="border-red-500/30 bg-red-500/10 text-red-400"
              >
                <Radio className="mr-1 h-3 w-3 animate-pulse" />
                LIVE
              </Badge>
            )}
          </div>
        </div>

        {/* Access / Payment */}
        <div className="mt-6 rounded-xl border border-border bg-card p-6">
          {hasPass ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
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
          ) : paymentStep === "success" ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
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
            <div className="text-center py-8">
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
              <h2 className="mt-4 text-lg font-semibold">
                Waiting for Payment
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Please confirm the payment on your phone. This may take a
                moment...
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold">Get Match Pass</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Pay <span className="font-medium text-foreground">${match.price}</span>{" "}
                to unlock this match stream.
              </p>

              {paymentError && (
                <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {paymentError}
                </div>
              )}

              <Separator className="my-5" />

              {/* Provider selection */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setProvider("ECOCASH")}
                  className={`flex items-center gap-2 rounded-lg border p-3 text-left text-sm font-medium transition-all ${
                    provider === "ECOCASH"
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-background text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  <Smartphone className="h-5 w-5" />
                  EcoCash
                </button>
                <button
                  onClick={() => setProvider("PAYPAL")}
                  className={`flex items-center gap-2 rounded-lg border p-3 text-left text-sm font-medium transition-all ${
                    provider === "PAYPAL"
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-background text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  <CreditCard className="h-5 w-5" />
                  PayPal
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
                  </div>
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
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      `Pay $${match.price} with ${provider === "ECOCASH" ? "EcoCash" : "PayPal"}`
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
