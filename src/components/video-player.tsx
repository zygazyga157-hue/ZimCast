"use client";

import { useEffect, useRef } from "react";
import videojs from "video.js";
import type Player from "video.js/dist/types/player";
import "video.js/dist/video-js.css";

interface VideoPlayerProps {
  src: string;
  type?: string;
  autoplay?: boolean;
  poster?: string;
}

export function VideoPlayer({
  src,
  type = "application/x-mpegURL",
  autoplay = false,
  poster,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player | null>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    const videoElement = document.createElement("video-js");
    videoElement.classList.add("vjs-big-play-centered", "vjs-16-9");
    videoRef.current.appendChild(videoElement);

    const player = videojs(videoElement, {
      autoplay,
      controls: true,
      responsive: true,
      fluid: true,
      poster,
      sources: [{ src, type }],
      html5: {
        vhs: {
          overrideNative: true,
        },
      },
    });

    playerRef.current = player;

    return () => {
      if (playerRef.current && !playerRef.current.isDisposed()) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [src, type, autoplay, poster]);

  return (
    <div data-vjs-player className="overflow-hidden rounded-xl">
      <div ref={videoRef} />
    </div>
  );
}
