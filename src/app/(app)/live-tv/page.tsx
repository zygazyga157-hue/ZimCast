"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { Loader2, Radio } from "lucide-react";
import { PageTransition } from "@/components/page-transition";
import { Badge } from "@/components/ui/badge";

const VideoPlayer = dynamic(
  () => import("@/components/video-player").then((m) => ({ default: m.VideoPlayer })),
  { ssr: false }
);

export default function LiveTVPage() {
  const { data: session } = useSession();
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchToken() {
      try {
        const res = await fetch("/api/streams/ztv/token");
        if (!res.ok) {
          setError("Unable to load ZTV stream. Please try again later.");
          return;
        }
        const data = await res.json();
        // Build the HLS URL with the token
        const baseUrl =
          process.env.NEXT_PUBLIC_MEDIAMTX_HLS_URL ?? "/hls";
        setStreamUrl(`${baseUrl}/ztv/index.m3u8?token=${data.token}`);
      } catch {
        setError("Failed to connect to the streaming server.");
      } finally {
        setLoading(false);
      }
    }

    fetchToken();
  }, [session]);

  return (
    <PageTransition>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center gap-3">
          <h1 className="text-2xl font-bold sm:text-3xl">Live TV</h1>
          <Badge
            variant="outline"
            className="border-red-500/30 bg-red-500/10 text-red-400"
          >
            <Radio className="mr-1 h-3 w-3 animate-pulse" />
            LIVE
          </Badge>
        </div>

        {loading ? (
          <div className="flex h-[50vh] items-center justify-center rounded-xl bg-card">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex h-[50vh] items-center justify-center rounded-xl bg-card">
            <p className="text-muted-foreground">{error}</p>
          </div>
        ) : streamUrl ? (
          <VideoPlayer src={streamUrl} autoplay />
        ) : null}

        <div className="mt-6 rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">Zimbabwe Television (ZTV)</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Watch ZTV live — free for all users. This is the free-to-air channel
            from Zimbabwe Broadcasting Corporation.
          </p>
        </div>
      </div>
    </PageTransition>
  );
}
