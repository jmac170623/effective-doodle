"use client";

import { useEffect, useRef } from "react";

export interface HeroStageClip {
  src: string;
}

// Extends HeroScrubVideo's scroll-linked playback (scrolling down advances
// through the video, scrolling back up rewinds it) across several
// independently generated clips — one per stage photo — instead of one
// video file. The whole hero section's scroll range is divided into equal
// segments, one per clip; scrolling through the section plays each stage's
// own animation in turn. A single <video> element is reused and its `src`
// swapped between segments (never several videos mounted at once) to keep
// memory bounded — a real crash source discovered elsewhere in this app.
export function HeroStageScrubVideo({ clips, posterUrl, className }: { clips: HeroStageClip[]; posterUrl?: string; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const durationsRef = useRef<number[]>(clips.map(() => 0));
  const currentIndexRef = useRef(-1);
  const pendingSeekRef = useRef(0);

  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container || clips.length === 0) return;

    let raf = 0;

    function loadSegment(index: number, seekTo: number) {
      currentIndexRef.current = index;
      pendingSeekRef.current = seekTo;
      video!.src = clips[index].src;
      video!.load();
    }

    function onLoadedMetadata() {
      durationsRef.current[currentIndexRef.current] = video!.duration || 0;
      video!.currentTime = pendingSeekRef.current;
    }

    function updateScrub() {
      raf = 0;
      const rect = container!.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const total = viewportHeight + rect.height;
      const progress = Math.min(1, Math.max(0, (viewportHeight - rect.top) / total));

      const segmentCount = clips.length;
      const raw = progress * segmentCount;
      const index = Math.min(segmentCount - 1, Math.floor(raw));
      const localProgress = Math.min(1, raw - index);
      const duration = durationsRef.current[index];
      const seekTo = duration ? localProgress * duration : 0;

      if (index !== currentIndexRef.current) {
        loadSegment(index, seekTo);
      } else if (duration) {
        video!.currentTime = seekTo;
      }
    }

    function onScroll() {
      if (raf) return;
      raf = requestAnimationFrame(updateScrub);
    }

    video.addEventListener("loadedmetadata", onLoadedMetadata);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    loadSegment(0, 0);

    return () => {
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [clips]);

  return (
    <div ref={containerRef} className={className}>
      <video
        ref={videoRef}
        poster={posterUrl}
        muted
        playsInline
        preload="auto"
        className="h-full w-full object-cover"
      />
    </div>
  );
}
