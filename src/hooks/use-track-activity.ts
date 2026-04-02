"use client";

import { useEffect, useRef, useCallback } from "react";

interface UseTrackActivityOptions {
  programId?: string | null;
  matchId?: string | null;
  action?: string;
  intervalMs?: number;
  /** When false, time accumulation and sending are paused (default: true) */
  enabled?: boolean;
}

export function useTrackActivity({
  programId,
  matchId,
  action = "WATCH",
  intervalMs = 30000,
  enabled = true,
}: UseTrackActivityOptions) {
  const sessionStartRef = useRef<string>(new Date().toISOString());
  const durationRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const sendActivity = useCallback(async () => {
    if (durationRef.current === 0) return;
    // Nothing to attribute — skip rather than create orphan "OTHER" records
    if (!programId && !matchId) return;

    const duration = durationRef.current;
    durationRef.current = 0;

    try {
      await fetch("/api/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programId: programId || undefined,
          matchId: matchId || undefined,
          action,
          watchDuration: Math.round(duration / 1000),
          sessionStart: sessionStartRef.current,
        }),
      });
    } catch {
      // Silently fail — don't interrupt user experience
    }
  }, [programId, matchId, action]);

  useEffect(() => {
    if (!enabled) return;
    sessionStartRef.current = new Date().toISOString();
    durationRef.current = 0;

    // Accumulate watch time
    const tick = setInterval(() => {
      durationRef.current += 1000;
    }, 1000);

    // Send periodically
    intervalRef.current = setInterval(sendActivity, intervalMs);

    // Send on visibility change (user switches tab)
    const handleVisibilityChange = () => {
      if (document.hidden) sendActivity();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(tick);
      clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      sendActivity(); // Send remaining on unmount
    };
  }, [programId, matchId, sendActivity, intervalMs, enabled]);
}
