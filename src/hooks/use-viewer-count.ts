"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface UseViewerCountOptions {
  /** Channel name, e.g. "ztv" or "match_dynamos_caps" */
  channel: string | null;
  /** Heartbeat interval in milliseconds (default: 15 000) */
  heartbeatMs?: number;
}

/**
 * Sends periodic heartbeats to the viewer counter API and
 * returns the live viewer count for the given channel.
 *
 * Automatically sends a DELETE on unmount / page hide so the
 * count updates promptly when a viewer leaves.
 */
export function useViewerCount({
  channel,
  heartbeatMs = 15_000,
}: UseViewerCountOptions) {
  const [viewers, setViewers] = useState<number>(0);
  const channelRef = useRef<string | null>(channel);

  useEffect(() => {
    channelRef.current = channel;
  }, [channel]);

  const heartbeat = useCallback(async () => {
    if (!channelRef.current) return;
    try {
      const res = await fetch("/api/streams/viewers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: channelRef.current }),
      });
      if (res.ok) {
        const data = await res.json();
        setViewers(data.viewers ?? 0);
      }
    } catch {
      // Silently fail — viewer count is non-critical
    }
  }, []);

  const leave = useCallback(() => {
    if (!channelRef.current) return;
    try {
      // keepalive: true ensures the request completes even during page unload
      fetch("/api/streams/viewers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: channelRef.current }),
        keepalive: true,
      });
    } catch {
      // Best effort — stale entries auto-expire via Redis TTL
    }
  }, []);

  useEffect(() => {
    if (!channel) return;

    // Initial heartbeat (deferred to avoid setState directly in effect)
    const initial = setTimeout(() => {
      void heartbeat();
    }, 0);

    // Periodic heartbeats
    const interval = setInterval(heartbeat, heartbeatMs);

    // Leave on page hide (BFCache-friendly) / when tab is hidden
    const handleVisibilityChange = () => {
      if (document.hidden) leave();
      else heartbeat();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", leave);

    return () => {
      clearTimeout(initial);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", leave);
      leave();
    };
  }, [channel, heartbeatMs, heartbeat, leave]);

  return channel ? viewers : 0;
}
