"use client";

import { useEffect, useRef } from "react";

// Binds the video's playback position to how far the hero section has
// scrolled through the viewport, instead of autoplaying — scrolling down
// visually advances through the transformation (e.g. the build phases of a
// job), and scrolling back up rewinds it.
export function HeroScrubVideo({ src, posterUrl, className }: { src: string; posterUrl?: string; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const durationRef = useRef(0);

  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;

    let raf = 0;

    function updateScrub() {
      raf = 0;
      const video = videoRef.current;
      const container = containerRef.current;
      if (!video || !container || !durationRef.current) return;

      const rect = container.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const total = viewportHeight + rect.height;
      const progress = Math.min(1, Math.max(0, (viewportHeight - rect.top) / total));
      video.currentTime = progress * durationRef.current;
    }

    function onScroll() {
      if (raf) return;
      raf = requestAnimationFrame(updateScrub);
    }

    function onLoadedMetadata() {
      durationRef.current = video?.duration || 0;
      updateScrub();
    }

    video.addEventListener("loadedmetadata", onLoadedMetadata);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    updateScrub();

    return () => {
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={containerRef} className={className}>
      <video
        ref={videoRef}
        src={src}
        poster={posterUrl}
        muted
        playsInline
        preload="auto"
        className="h-full w-full object-cover"
      />
    </div>
  );
}
