"use client";

import { useEffect, useRef } from "react";

export interface HeroStageClip {
  src: string;
}

// Apple-product-page-style pinned scroll scrubbing: the hero stays fixed in
// the viewport (CSS `sticky`) for a scroll range proportional to the number
// of stage clips. Scrolling through that range drives playback — each
// clip's own animation plays in turn — without the page itself moving.
// Only once every clip has played does further scrolling resume normal
// page movement: the tall wrapper below is exactly that "pin budget", and
// once it's exhausted the sticky element scrolls away like anything else.
//
// This replaces an earlier version that scrubbed by swapping a single
// <video>'s `src` on segment boundaries and mapped progress to the
// un-pinned section's own (short) scroll distance. Both were real bugs:
// swapping `src` forces a full network reload before the next frame can
// show, which looked like "nothing happens, then it jumps to the next
// photo"; and because the section wasn't pinned, progress reached 1 only
// once the section had already scrolled off the top of the screen, so the
// final stage was never actually visible. All clips are now preloaded into
// their own <video> elements (only the active one visible) so switching is
// instant, and progress is driven by the pinned wrapper's own scroll range.
// Hero clips are capped at a handful by the hero-animation route, so
// mounting them all is bounded and safe — unlike the many-item gallery
// case elsewhere in this app, which mounts at most one video at a time.
const VH_PER_CLIP = 1.6;

export function HeroStageScrubVideo({
  clips,
  posterUrl,
  className,
  children,
}: {
  clips: HeroStageClip[];
  posterUrl?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const durationsRef = useRef<number[]>(clips.map(() => 0));
  const activeIndexRef = useRef(0);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper || clips.length === 0) return;

    let raf = 0;

    function setActive(index: number) {
      if (index === activeIndexRef.current) return;
      const prev = videoRefs.current[activeIndexRef.current];
      if (prev) prev.style.opacity = "0";
      activeIndexRef.current = index;
      const next = videoRefs.current[index];
      if (next) next.style.opacity = "1";
    }

    function updateScrub() {
      raf = 0;
      const rect = wrapper!.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const pinRange = rect.height - viewportHeight;
      const progress = pinRange > 0 ? Math.min(1, Math.max(0, -rect.top / pinRange)) : 0;

      const segmentCount = clips.length;
      const raw = progress * segmentCount;
      const index = Math.min(segmentCount - 1, Math.floor(raw));
      const localProgress = Math.min(1, raw - index);

      setActive(index);
      const video = videoRefs.current[index];
      const duration = durationsRef.current[index];
      if (video && duration) {
        video.currentTime = localProgress * duration;
      }
    }

    function onScroll() {
      if (raf) return;
      raf = requestAnimationFrame(updateScrub);
    }

    updateScrub();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [clips]);

  return (
    <div ref={wrapperRef} className={`relative ${className ?? ""}`} style={{ height: `${clips.length * VH_PER_CLIP * 100}vh` }}>
      <div className="sticky top-0 flex h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
        {clips.map((clip, index) => (
          <video
            key={clip.src}
            ref={(el) => {
              videoRefs.current[index] = el;
            }}
            src={clip.src}
            poster={index === 0 ? posterUrl : undefined}
            muted
            playsInline
            preload="auto"
            onLoadedMetadata={(e) => {
              durationsRef.current[index] = e.currentTarget.duration || 0;
            }}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ opacity: index === 0 ? 1 : 0 }}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/10" />
        {children}
      </div>
    </div>
  );
}
