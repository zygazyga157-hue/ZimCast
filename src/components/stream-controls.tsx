"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Users, Share2, Settings, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type Player from "video.js/dist/types/player";

interface StreamControlsProps {
  viewers: number;
  player: Player | null;
}

interface QualityLevel {
  label: string;
  height: number;
  enabled: boolean;
}

export function StreamControls({ viewers, player }: StreamControlsProps) {
  const [showQuality, setShowQuality] = useState(false);
  const [qualities, setQualities] = useState<QualityLevel[]>([]);
  const [activeQuality, setActiveQuality] = useState("Auto");
  const [shareSuccess, setShareSuccess] = useState(false);

  // Try to read quality levels from the player
  const loadQualities = useCallback(() => {
    if (!player) return;
    try {
      const qualityLevels = (player as unknown as Record<string, unknown>).qualityLevels as
        | { length: number; [i: number]: { height: number; enabled: boolean } }
        | undefined;

      if (qualityLevels && qualityLevels.length > 0) {
        const levels: QualityLevel[] = [];
        for (let i = 0; i < qualityLevels.length; i++) {
          const q = qualityLevels[i];
          levels.push({
            label: `${q.height}p`,
            height: q.height,
            enabled: q.enabled,
          });
        }
        levels.sort((a, b) => b.height - a.height);
        setQualities(levels);
      }
    } catch {
      // Quality levels plugin not available — graceful fallback
    }
  }, [player]);

  const handleQualityToggle = () => {
    loadQualities();
    setShowQuality(!showQuality);
  };

  const selectQuality = (label: string, height?: number) => {
    if (!player) return;
    setActiveQuality(label);

    try {
      const qualityLevels = (player as unknown as Record<string, unknown>).qualityLevels as
        | { length: number; [i: number]: { height: number; enabled: boolean } }
        | undefined;

      if (qualityLevels) {
        for (let i = 0; i < qualityLevels.length; i++) {
          qualityLevels[i].enabled = height === undefined || qualityLevels[i].height === height;
        }
      }
    } catch {
      // Graceful fallback
    }
    setShowQuality(false);
  };

  const handleShare = async () => {
    const shareData = {
      title: "ZimCast Live TV — ZTV",
      text: "Watch ZTV live on ZimCast!",
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 2000);
      }
    } catch {
      // User cancelled share dialog
    }
  };

  const formattedViewers = viewers >= 1000
    ? `${(viewers / 1000).toFixed(1)}k`
    : String(viewers);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-2 flex items-center justify-between rounded-lg border border-border/60 bg-card/60 px-4 py-2"
    >
      {/* Viewer count */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        <span>
          <span className="font-medium text-foreground">{formattedViewers}</span> watching
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1">
        {/* Quality selector */}
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleQualityToggle}
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
          >
            <Settings className="h-4 w-4" />
            <span className="ml-1.5 text-xs">{activeQuality}</span>
          </Button>

          {showQuality && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-full right-0 mb-1 w-36 rounded-lg border border-border bg-card p-1 shadow-lg z-50"
            >
              <button
                onClick={() => selectQuality("Auto")}
                className="flex w-full items-center justify-between rounded-md px-3 py-1.5 text-xs hover:bg-muted transition-colors"
              >
                <span>Auto</span>
                {activeQuality === "Auto" && <Check className="h-3 w-3 text-primary" />}
              </button>
              {qualities.length > 0 ? (
                qualities.map((q) => (
                  <button
                    key={q.height}
                    onClick={() => selectQuality(q.label, q.height)}
                    className="flex w-full items-center justify-between rounded-md px-3 py-1.5 text-xs hover:bg-muted transition-colors"
                  >
                    <span>{q.label}</span>
                    {activeQuality === q.label && <Check className="h-3 w-3 text-primary" />}
                  </button>
                ))
              ) : (
                <p className="px-3 py-1.5 text-xs text-muted-foreground">
                  Auto only
                </p>
              )}
            </motion.div>
          )}
        </div>

        {/* Share button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleShare}
          className="h-8 px-2 text-muted-foreground hover:text-foreground"
        >
          {shareSuccess ? (
            <Check className="h-4 w-4 text-green-400" />
          ) : (
            <Share2 className="h-4 w-4" />
          )}
          <span className="ml-1.5 text-xs">
            {shareSuccess ? "Copied!" : "Share"}
          </span>
        </Button>
      </div>
    </motion.div>
  );
}
