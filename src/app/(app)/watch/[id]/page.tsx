"use client";

import { useEffect, useState, use } from "react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Radio, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageTransition } from "@/components/page-transition";
import { api, ApiError } from "@/lib/api";

const VideoPlayer = dynamic(() => import("@/components/video-player"), { ssr: false });

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  kickoff: string;
  isLive: boolean;
  streamKey: string;
}

export default function WatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const [match, setMatch] = useState<Match | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.push("/login");
      return;
    }

    async function loadStream() {
      try {
        const matchData = await api<Match>(`/api/matches/${id}`);
        setMatch(matchData);

        const tokenData = await api<{ token: string }>(
          `/api/streams/token?matchId=${id}`
        );
        const baseUrl =
          process.env.NEXT_PUBLIC_MEDIAMTX_HLS_URL ?? "/hls";
        setStreamUrl(
          `${baseUrl}/${matchData.streamKey}/index.m3u8?token=${tokenData.token}`
        );
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError("Failed to load the stream. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    }

    loadStream();
  }, [id, session, status, router]);

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <Link
          href={`/sports/${id}`}
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Match
        </Link>

        {error ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-secondary">
              <Lock className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <h2 className="font-semibold">Access Denied</h2>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            </div>
            <div className="flex gap-3">
              <Button className="gradient-accent border-0 text-white" asChild>
                <Link href={`/sports/${id}`}>Get Match Pass</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/sports">Browse Matches</Link>
              </Button>
            </div>
          </div>
        ) : (
          <>
            {streamUrl && <VideoPlayer src={streamUrl} autoplay />}

            {match && (
              <div className="mt-4 rounded-xl border border-border bg-card px-5 py-4 flex items-center justify-between gap-4">
                <div>
                  <h1 className="font-semibold">
                    {match.homeTeam} <span className="text-muted-foreground font-normal text-sm">vs</span> {match.awayTeam}
                  </h1>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {new Date(match.kickoff).toLocaleDateString("en-ZW", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                {match.isLive && (
                  <Badge
                    variant="outline"
                    className="shrink-0 border-red-500/30 bg-red-500/10 text-red-400"
                  >
                    <Radio className="mr-1 h-3 w-3 animate-pulse" />
                    LIVE
                  </Badge>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </PageTransition>
  );
}
