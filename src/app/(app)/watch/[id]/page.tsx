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

const VideoPlayer = dynamic(
  () => import("@/components/video-player").then((m) => ({ default: m.VideoPlayer })),
  { ssr: false }
);

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  kickoff: string;
  isLive: boolean;
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
        const [matchRes, tokenRes] = await Promise.all([
          fetch(`/api/matches/${id}`),
          fetch(`/api/streams/token?matchId=${id}`),
        ]);

        if (!matchRes.ok) {
          setError("Match not found.");
          setLoading(false);
          return;
        }

        const matchData = await matchRes.json();
        setMatch(matchData);

        if (!tokenRes.ok) {
          const tokenError = await tokenRes.json();
          setError(
            tokenError.error ??
              "You don't have access to this stream. Purchase a match pass first."
          );
          setLoading(false);
          return;
        }

        const tokenData = await tokenRes.json();
        const baseUrl =
          process.env.NEXT_PUBLIC_MEDIAMTX_HLS_URL ?? "/hls";
        setStreamUrl(
          `${baseUrl}/${matchData.streamKey}/index.m3u8?token=${tokenData.token}`
        );
      } catch {
        setError("Failed to load the stream. Please try again.");
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
          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 rounded-xl bg-card">
            <Lock className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">{error}</p>
            <Button variant="outline" asChild>
              <Link href={`/sports/${id}`}>Get Match Pass</Link>
            </Button>
          </div>
        ) : (
          <>
            {streamUrl && <VideoPlayer src={streamUrl} autoplay />}

            {match && (
              <div className="mt-4 flex items-center gap-3">
                <h1 className="text-lg font-semibold">
                  {match.homeTeam} vs {match.awayTeam}
                </h1>
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
            )}
          </>
        )}
      </div>
    </PageTransition>
  );
}
