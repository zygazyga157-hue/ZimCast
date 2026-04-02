"use client";

import { motion } from "framer-motion";
import { Tv, Radio, Signal } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ChannelInfoProps {
  isLive: boolean;
  viewers: number;
}

export function ChannelInfo({ isLive, viewers }: ChannelInfoProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 rounded-xl border border-border bg-card p-4 sm:p-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {/* Channel logo */}
          <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-accent shadow-lg shadow-primary/20">
            <Tv className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold">ZTV</h2>
              <Badge variant="outline" className="border-green-500/30 bg-green-500/10 text-green-400 text-[10px]">
                FREE
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Zimbabwe Broadcasting Corporation • Free-to-air
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isLive && (
            <Badge
              variant="outline"
              className="border-red-500/30 bg-red-500/10 text-red-400"
            >
              <Radio className="mr-1 h-3 w-3 animate-pulse" />
              LIVE
            </Badge>
          )}
          {viewers > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Signal className="h-3.5 w-3.5" />
              <span>{viewers >= 1000 ? `${(viewers / 1000).toFixed(1)}k` : viewers} viewers</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
