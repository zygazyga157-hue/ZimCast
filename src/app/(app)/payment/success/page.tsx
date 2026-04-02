"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/page-transition";
import { api } from "@/lib/api";

type Status = "loading" | "success" | "pending" | "failed";

function PaymentResult() {
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref");

  const [status, setStatus] = useState<Status>("loading");
  const [matchId, setMatchId] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);

  const checkStatus = useCallback(async () => {
    if (!ref) {
      setStatus("failed");
      return;
    }

    try {
      const data = await api<{
        status: string;
        hasAccess?: boolean;
        matchId?: string;
      }>(`/api/payments/poll/${ref}`);

      if (data.status === "COMPLETED") {
        setStatus("success");
        if (data.matchId) setMatchId(data.matchId);
      } else if (data.status === "FAILED") {
        setStatus("failed");
      } else {
        setStatus("pending");
      }
    } catch {
      setStatus("failed");
    }
  }, [ref]);

  useEffect(() => {
    if (!ref) return;

    let cancelled = false;

    (async () => {
      try {
        const data = await api<{
          status: string;
          hasAccess?: boolean;
          matchId?: string;
        }>(`/api/payments/poll/${ref}`);

        if (cancelled) return;

        if (data.status === "COMPLETED") {
          setStatus("success");
          setMatchId(data.matchId ?? null);
          return;
        }

        if (data.status === "FAILED") {
          setStatus("failed");
          return;
        }

        setStatus("pending");
      } catch {
        if (cancelled) return;
        setStatus("failed");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ref]);

  // Auto-poll while pending (max 20 attempts, every 3s)
  useEffect(() => {
    if (status !== "pending" || pollCount >= 20) return;
    const timer = setTimeout(() => {
      setPollCount((c) => c + 1);
      checkStatus();
    }, 3000);
    return () => clearTimeout(timer);
  }, [status, pollCount, checkStatus]);

  const effectiveStatus: Status = ref ? status : "failed";

  if (effectiveStatus === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
        {effectiveStatus === "success" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <h1 className="mt-6 text-2xl font-bold">Payment Successful!</h1>
            <p className="mt-2 text-muted-foreground">
              Your match pass has been activated. You can start watching now.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              {matchId && (
                <Button className="gradient-accent border-0 text-white" asChild>
                  <Link href={`/watch/${matchId}`}>Watch Now</Link>
                </Button>
              )}
              <Button variant="outline" asChild>
                <Link href="/sports">Browse Matches</Link>
              </Button>
            </div>
          </motion.div>
        )}

        {effectiveStatus === "pending" && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="relative mx-auto mb-6 h-16 w-16">
              <Loader2 className="h-16 w-16 animate-spin text-primary/30" />
              <Loader2
                className="absolute inset-0 h-16 w-16 animate-spin text-primary [animation-duration:1.5s]"
                style={{ clipPath: "inset(0 50% 0 0)" }}
              />
            </div>
            <h1 className="text-xl font-bold">Processing Payment…</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your payment is being confirmed. This page will update
              automatically.
            </p>
            {pollCount >= 20 && (
              <p className="mt-4 text-sm text-muted-foreground">
                Taking longer than expected.{" "}
                <button
                  onClick={() => {
                    setPollCount(0);
                    setStatus("loading");
                    checkStatus();
                  }}
                  className="font-medium text-primary hover:underline"
                >
                  Check again
                </button>
              </p>
            )}
          </motion.div>
        )}

        {effectiveStatus === "failed" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="mt-6 text-2xl font-bold">Payment Failed</h1>
            <p className="mt-2 text-muted-foreground">
              {ref
                ? "Your payment could not be completed. No charges were made."
                : "No payment reference found. Please try again from the match page."}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button className="gradient-accent border-0 text-white" asChild>
                <Link href="/sports">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Sports
                </Link>
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </PageTransition>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <PaymentResult />
    </Suspense>
  );
}
