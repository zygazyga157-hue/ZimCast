"use client";

import { useEffect, useState, useCallback, use } from "react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Radio, Lock, Calendar, Clock, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageTransition } from "@/components/page-transition";
import { StreamControls } from "@/components/stream-controls";
import { useViewerCount } from "@/hooks/use-viewer-count";
import { useTrackActivity } from "@/hooks/use-track-activity";
import { api, ApiError } from "@/lib/api";
import type { MatchPhase } from "@/lib/match-window";
import type Player from "video.js/dist/types/player";

const VideoPlayer = dynamic(() => import("@/components/video-player"), { ssr: false });

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  kickoff: string;
  isLive: boolean;
  streamKey: string;
  phase?: MatchPhase;
  passStart?: string;
  passEnd?: string;
  phaseEndsAt?: string;
}

function getInitials(team: string): string {
  const words = team.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.map((w) => w[0]).join("").slice(0, 3).toUpperCase();
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
  const [errorCode, setErrorCode] = useState<number | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [countdown, setCountdown] = useState("");
  const [passStartIso, setPassStartIso] = useState<string | null>(null);

  // Only register viewer count when actually playing
  const channel = isPlaying && match?.streamKey ? match.streamKey : null;
  const viewers = useViewerCount({ channel });

  // Track match viewing activity only when playing
  useTrackActivity({ matchId: match?.id, enabled: isPlaying });

  const handleReady = useCallback((p: Player) => {
    setPlayer(p);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);
    const onError = () => setIsPlaying(false);
    p.on("play", onPlay);
    p.on("pause", onPause);
    p.on("ended", onEnded);
    p.on("error", onError);
  }, []);

  // Countdown for pregame
  useEffect(() => {
    if (!passStartIso) return;
    const target = new Date(passStartIso).getTime();
    const update = () => {
      const diff = target - Date.now();
      if (diff <= 0) {
        setCountdown("");
        // Reload to request token now that window is open
        window.location.reload();
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (h > 0) setCountdown(`${h}h ${m}m ${s}s`);
      else setCountdown(`${m}m ${s}s`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [passStartIso]);

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

        const tokenData = await api<{
          token: string;
          streamUrl: string;
          passEnd?: string;
          expiresInSeconds?: number;
        }>("/api/streams/token", { method: "POST", body: { matchId: id } });
        setStreamUrl(tokenData.streamUrl);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
          setErrorCode(err.status);
          // If 409, the token route returned passStart info
          if (err.status === 409) {
            try {
              const body = JSON.parse(err.message);
              if (body.passStart) setPassStartIso(body.passStart);
            } catch {
              // Extract passStart from match data instead
            }
          }
        } else {
          setError("Failed to load the stream. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    }

    loadStream();
  }, [id, session, status, router]);

  // If we got a 409 (before window) and have the match, derive passStart for countdown
  useEffect(() => {
    if (errorCode === 409 && match?.passStart && !passStartIso) {
      setPassStartIso(match.passStart);
    }
  }, [errorCode, match, passStartIso]);

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const kickoff = match ? new Date(match.kickoff) : null;

  // Pregame waiting screen (409 — before pass window)
  if (errorCode === 409 && match) {
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

          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card p-8 text-center">
            <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-400 text-sm px-4 py-1">
              STARTING SOON
            </Badge>
            <h2 className="text-xl font-semibold">
              {match.homeTeam} vs {match.awayTeam}
            </h2>
            <p className="text-sm text-muted-foreground">
              The stream will be available 15 minutes before kickoff.
            </p>
            {countdown && (
              <div className="flex items-center gap-2 text-lg font-medium text-primary">
                <Timer className="h-5 w-5" />
                {countdown}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              This page will auto-refresh when the stream is ready.
            </p>
          </div>
        </div>
      </PageTransition>
    );
  }

  // Expired/ended screen (403 — pass expired)
  if (errorCode === 403 && error.toLowerCase().includes("expired") && match) {
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

          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card p-8 text-center">
            <Badge className="border-muted-foreground/30 bg-muted/30 text-muted-foreground text-sm px-4 py-1">
              ENDED
            </Badge>
            <h2 className="text-xl font-semibold">Stream Ended</h2>
            <p className="text-sm text-muted-foreground">
              The access window for this match has ended.
            </p>
            <Button variant="outline" asChild>
              <Link href="/sports">Browse Matches</Link>
            </Button>
          </div>
        </div>
      </PageTransition>
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
            {/* Video player */}
            <div className="overflow-hidden rounded-xl border border-border">
              {streamUrl && (
                <VideoPlayer src={streamUrl} autoplay onReady={handleReady} />
              )}
            </div>

            {/* Controls bar */}
            {match && (
              <div className="mt-3">
                <StreamControls viewers={viewers} player={player} />
              </div>
            )}

            {/* Match info panel */}
            {match && kickoff && (
              <div className="mt-4 rounded-xl border border-border bg-card p-5">
                {/* Teams VS header */}
                <div className="flex items-center gap-4">
                  <div className="flex flex-1 items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/5 text-xs font-bold text-primary">
                      {getInitials(match.homeTeam)}
                    </div>
                    <p className="truncate text-sm font-semibold">
                      {match.homeTeam}
                    </p>
                  </div>
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                    VS
                  </div>
                  <div className="flex flex-1 items-center gap-3 min-w-0 flex-row-reverse">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-accent/20 bg-accent/5 text-xs font-bold text-accent">
                      {getInitials(match.awayTeam)}
                    </div>
                    <p className="truncate text-right text-sm font-semibold">
                      {match.awayTeam}
                    </p>
                  </div>
                </div>

                {/* Date + status */}
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {kickoff.toLocaleDateString("en-ZW", {
                        weekday: "short", month: "short", day: "numeric",
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {kickoff.toLocaleTimeString("en-ZW", {
                        hour: "2-digit", minute: "2-digit", hour12: false,
                      })}
                    </span>
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
            )}
          </>
        )}
      </div>
    </PageTransition>
  );
}
