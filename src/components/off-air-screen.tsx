"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Tv, RefreshCw, Clock, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OffAirScreenProps {
  errorMessage?: string;
  nextProgram?: {
    title: string;
    startTime: string;
    category: string;
  } | null;
  onRetry: () => void;
}

export function OffAirScreen({ errorMessage, nextProgram, onRetry }: OffAirScreenProps) {
  const [countdown, setCountdown] = useState("");
  const [autoRetryIn, setAutoRetryIn] = useState(15);

  // Auto-retry countdown
  useEffect(() => {
    setAutoRetryIn(15);
    const interval = setInterval(() => {
      setAutoRetryIn((prev) => {
        if (prev <= 1) {
          onRetry();
          return 15;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [onRetry]);

  // Next program countdown
  useEffect(() => {
    if (!nextProgram) return;
    const update = () => {
      const diff = new Date(nextProgram.startTime).getTime() - Date.now();
      if (diff <= 0) {
        setCountdown("Starting now...");
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(
        h > 0 ? `${h}h ${m}m ${s}s` : m > 0 ? `${m}m ${s}s` : `${s}s`
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [nextProgram]);

  const handleRetry = useCallback(() => {
    setAutoRetryIn(15);
    onRetry();
  }, [onRetry]);

  return (
    <div className="relative overflow-hidden rounded-xl" style={{ aspectRatio: "16/9" }}>
      {/* Animated noise background */}
      <div className="off-air-bg absolute inset-0" />

      {/* Color bars strip */}
      <div className="off-air-bars absolute top-0 left-0 right-0 h-2 opacity-60" />
      <div className="off-air-bars absolute bottom-0 left-0 right-0 h-2 opacity-60" />

      {/* Scanline overlay */}
      <div className="off-air-scanline absolute inset-0 pointer-events-none" />

      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(0,0,0,0.6)_100%)]" />

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center gap-6 p-6 text-center">
        {/* ZBC Logo / Off Air symbol */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="off-air-text"
        >
          <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full border-2 border-white/20 bg-white/5 backdrop-blur-sm">
            <Tv className="h-10 w-10 text-white/80" />
          </div>
          <h2 className="text-2xl font-bold tracking-wide text-white sm:text-3xl">
            OFF AIR
          </h2>
          <p className="mt-1 text-sm text-white/50">
            Zimbabwe Broadcasting Corporation
          </p>
        </motion.div>

        {/* Error/status message */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="max-w-sm text-sm text-white/60"
        >
          {errorMessage || "The livestream is currently unavailable. We'll keep checking."}
        </motion.p>

        {/* Next program panel */}
        {nextProgram && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="rounded-lg border border-white/10 bg-white/5 px-5 py-3 backdrop-blur-sm"
          >
            <div className="flex items-center gap-2 text-xs text-white/40">
              <Calendar className="h-3.5 w-3.5" />
              <span>Coming up next</span>
            </div>
            <p className="mt-1 text-sm font-semibold text-white/90">
              {nextProgram.title}
            </p>
            <div className="mt-1 flex items-center gap-2 text-xs text-white/50">
              <Clock className="h-3 w-3" />
              <span>
                {new Date(nextProgram.startTime).toLocaleTimeString("en-ZW", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })}
              </span>
              {countdown && (
                <>
                  <span className="text-white/30">•</span>
                  <span className="text-primary/80">{countdown}</span>
                </>
              )}
            </div>
          </motion.div>
        )}

        {/* Retry controls */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="flex flex-col items-center gap-2"
        >
          <Button
            onClick={handleRetry}
            variant="outline"
            size="sm"
            className="border-white/20 bg-white/5 text-white hover:bg-white/10"
          >
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Retry Now
          </Button>
          <span className="text-xs text-white/30">
            Auto-retrying in {autoRetryIn}s
          </span>
        </motion.div>
      </div>
    </div>
  );
}
