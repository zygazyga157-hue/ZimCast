"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import type Player from "video.js/dist/types/player";
import { PageTransition } from "@/components/page-transition";
import { PullToRefresh } from "@/components/pull-to-refresh";
import { EpgStrip } from "@/components/epg-strip";
import { EpgFullSchedule } from "@/components/epg-full-schedule";
import { BlackoutCountdown } from "@/components/blackout-countdown";
import { OffAirScreen } from "@/components/off-air-screen";
import { NowPlaying } from "@/components/now-playing";
import { UpNext } from "@/components/up-next";
import { StreamControls } from "@/components/stream-controls";
import { ChannelInfo } from "@/components/channel-info";
import { Recommendations } from "@/components/recommendations";
import { useTrackActivity } from "@/hooks/use-track-activity";
import { useViewerCount } from "@/hooks/use-viewer-count";
import { api, ApiError } from "@/lib/api";

const VideoPlayer = dynamic(() => import("@/components/video-player"), { ssr: false });

interface ZtvStatus {
  available: boolean;
  currentProgram: { id: string; title: string; category: string; startTime: string; endTime: string } | null;
  blackoutMatch: { id: string; homeTeam: string; awayTeam: string; kickoff: string; isLive: boolean; price: number } | null;
  resumesAt: string | null;
}

interface EpgProgram {
  id: string;
  title: string;
  category: string;
  startTime: string;
  endTime: string;
  isLive: boolean;
  match?: { id: string; homeTeam: string; awayTeam: string } | null;
}

interface ProgramsResponse {
  programs: EpgProgram[];
  currentProgram: EpgProgram | null;
  nextProgram: EpgProgram | null;
}

export default function LiveTVPage() {
  const { data: session } = useSession();
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<ZtvStatus | null>(null);
  const [epgPrograms, setEpgPrograms] = useState<EpgProgram[]>([]);
  const [currentProgram, setCurrentProgram] = useState<EpgProgram | null>(null);
  const [nextProgram, setNextProgram] = useState<EpgProgram | null>(null);
  const playerRef = useRef<Player | null>(null);

  // Track viewing activity when stream is playing
  useTrackActivity({
    programId: status?.available ? status.currentProgram?.id : undefined,
  });

  // Viewer count — only heartbeat when stream is live
  const viewers = useViewerCount({
    channel: streamUrl ? "ztv" : null,
  });

  const fetchData = useCallback(async () => {
    setError("");
    try {
      const [statusData, epgData] = await Promise.all([
        api<ZtvStatus>("/api/streams/ztv/status"),
        api<ProgramsResponse>("/api/programs"),
      ]);

      setStatus(statusData);
      setEpgPrograms(epgData.programs ?? []);
      setCurrentProgram(epgData.currentProgram ?? null);
      setNextProgram(epgData.nextProgram ?? null);

      if (statusData.available) {
        const tokenData = await api<{ token: string }>("/api/streams/ztv/token");
        const baseUrl = process.env.NEXT_PUBLIC_MEDIAMTX_HLS_URL ?? "/hls";
        setStreamUrl(`${baseUrl}/ztv/index.m3u8?token=${tokenData.token}`);
      } else {
        setStreamUrl(null);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to connect to the streaming server.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData, session]);

  // Auto-refresh when blackout should end
  useEffect(() => {
    if (!status?.resumesAt || status.available) return;
    const ms = new Date(status.resumesAt).getTime() - Date.now();
    if (ms <= 0) return;
    const timeout = setTimeout(() => fetchData(), ms + 1000);
    return () => clearTimeout(timeout);
  }, [status, fetchData]);

  const isLive = !!streamUrl && !!status?.available;

  return (
    <PageTransition>
      <PullToRefresh onRefresh={fetchData}>
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Channel Info Banner */}
          <ChannelInfo isLive={isLive} viewers={viewers} />

          {/* Video / Off-Air / Blackout / Loading */}
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center rounded-xl bg-card"
                style={{ aspectRatio: "16/9" }}
              >
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </motion.div>
            ) : status && !status.available && status.blackoutMatch ? (
              <motion.div
                key="blackout"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.4 }}
              >
                <BlackoutCountdown
                  match={status.blackoutMatch}
                  resumesAt={status.resumesAt!}
                  programTitle={status.currentProgram?.title}
                />
              </motion.div>
            ) : streamUrl ? (
              <motion.div
                key="stream"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <VideoPlayer
                  src={streamUrl}
                  autoplay
                  onReady={(p) => { playerRef.current = p; }}
                />
              </motion.div>
            ) : (
              <motion.div
                key="off-air"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.4 }}
              >
                <OffAirScreen
                  errorMessage={error || undefined}
                  nextProgram={nextProgram}
                  onRetry={fetchData}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stream Controls — quality, share, viewer count */}
          {isLive && (
            <StreamControls viewers={viewers} player={playerRef.current} />
          )}

          {/* Now Playing + Up Next */}
          {currentProgram && <NowPlaying program={currentProgram} />}
          {nextProgram && <UpNext program={nextProgram} />}

          {/* EPG Schedule Strip */}
          {epgPrograms.length > 0 && (
            <EpgStrip
              programs={epgPrograms}
              currentProgramId={status?.currentProgram?.id}
            />
          )}

          {/* Full Day Schedule (expandable) */}
          {epgPrograms.length > 0 && (
            <EpgFullSchedule
              programs={epgPrograms}
              currentProgramId={status?.currentProgram?.id}
            />
          )}

          {/* Personalised Recommendations */}
          <Recommendations
            currentCategory={currentProgram?.category}
            programs={epgPrograms}
          />
        </div>
      </PullToRefresh>
    </PageTransition>
  );
}
