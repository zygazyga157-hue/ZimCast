"use client";

import { useEffect, useLayoutEffect, useRef, useCallback } from "react";

type Handler = (data: unknown) => void;

/* ── Module-level singleton ─────────────────────────────── */

let ws: WebSocket | null = null;
let reconnectDelay = 1000;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
const subs = new Map<string, Set<Handler>>();

function getWsUrl() {
  if (typeof window === "undefined") return "";
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/ws`;
}

function connect() {
  if (typeof window === "undefined") return;
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;

  try {
    ws = new WebSocket(getWsUrl());
  } catch {
    scheduleReconnect();
    return;
  }

  ws.onopen = () => {
    reconnectDelay = 1000;
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data as string);
      const type = msg?.type as string | undefined;
      if (!type) return;
      const handlers = subs.get(type);
      if (handlers) {
        for (const fn of handlers) {
          fn(msg.data);
        }
      }
    } catch {
      // Ignore malformed messages
    }
  };

  ws.onclose = () => {
    ws = null;
    scheduleReconnect();
  };

  ws.onerror = () => {
    ws?.close();
  };
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    reconnectDelay = Math.min(reconnectDelay * 2, 30_000);
    connect();
  }, reconnectDelay);
}

function subscribe(type: string, handler: Handler): () => void {
  if (!subs.has(type)) subs.set(type, new Set());
  subs.get(type)!.add(handler);

  // Ensure connection is open
  connect();

  return () => {
    const set = subs.get(type);
    if (set) {
      set.delete(handler);
      if (set.size === 0) subs.delete(type);
    }
  };
}

/* ── React hook ─────────────────────────────────────────── */

/**
 * Subscribe to a WebSocket message type. The callback is stable
 * across re-renders (uses a ref internally).
 *
 * @example
 * useZimcastSocket("epg:update", (data) => setEpg(data));
 */
export function useZimcastSocket(type: string, handler: Handler) {
  const handlerRef = useRef(handler);
  useLayoutEffect(() => {
    handlerRef.current = handler;
  });

  const stableHandler = useCallback((data: unknown) => {
    handlerRef.current(data);
  }, []);

  useEffect(() => {
    return subscribe(type, stableHandler);
  }, [type, stableHandler]);
}
