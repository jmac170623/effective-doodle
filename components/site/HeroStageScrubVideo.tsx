"use client";

import { useEffect, useRef, useState } from "react";

export interface HeroStageClip {
  src: string;
}

// Autoplay-then-release scroll: once the hero has scrolled to fill the
// viewport, scrolling locks (the page can't move further) while the stage
// clips play back-to-back at their own natural pace. The moment the last
// clip finishes, the lock lifts and scrolling continues normally from
// exactly where it left off.
//
// This replaces an earlier scroll-scrubbed version that mapped scroll
// position directly to each video's `currentTime`. That looked like
// "jumping frames" in practice: HTML5 video seeking has to decode forward
// from the nearest keyframe on every seek, so fast or fine-grained scroll
// input produced visibly stepped, non-smooth playback with no way to make
// it worse/better by tuning frame counts — the seek itself is the
// bottleneck, not how it's driven. Real, uninterrupted video playback (as
// used here) has no such per-frame seek cost, so it's smooth by
// construction; scrolling only decides *when* that playback starts, never
// *where* within it.
export function HeroStageScrubVideo({
  clips,
  posterUrl,
  className,
}: {
  clips: HeroStageClip[];
  posterUrl?: string;
  className?: string;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);
  const hasPlayedRef = useRef(false);
  const lockedRef = useRef(false);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper || clips.length === 0) return;

    function preventScroll(e: Event) {
      e.preventDefault();
    }

    function lockScroll() {
      lockedRef.current = true;
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
      window.addEventListener("wheel", preventScroll, { passive: false });
      window.addEventListener("touchmove", preventScroll, { passive: false });
    }

    function unlockScroll() {
      lockedRef.current = false;
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      window.removeEventListener("wheel", preventScroll);
      window.removeEventListener("touchmove", preventScroll);
    }

    function playIndex(index: number) {
      setActiveIndex(index);
      activeIndexRef.current = index;
      const video = videoRefs.current[index];
      if (video) {
        video.currentTime = 0;
        video.play().catch(() => {});
      }
    }

    function handleClipEnded(index: number) {
      if (index !== activeIndexRef.current) return;
      const nextIndex = index + 1;
      if (nextIndex < clips.length) {
        playIndex(nextIndex);
      } else {
        hasPlayedRef.current = true;
        unlockScroll();
      }
    }

    const videos = videoRefs.current;
    const endedHandlers = clips.map((_, index) => () => handleClipEnded(index));
    videos.forEach((video, index) => {
      video?.addEventListener("ended", endedHandlers[index]);
    });

    let raf = 0;
    function checkTrigger() {
      raf = 0;
      if (hasPlayedRef.current || lockedRef.current) return;
      const rect = wrapper!.getBoundingClientRect();
      if (rect.top <= 0 && rect.top > -rect.height) {
        // Snap so the hero fills the viewport exactly, then hold it there.
        window.scrollTo({ top: window.scrollY + rect.top, behavior: "auto" });
        lockScroll();
        playIndex(0);
      }
    }

    function onScroll() {
      if (raf) return;
      raf = requestAnimationFrame(checkTrigger);
    }

    checkTrigger();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
      videos.forEach((video, index) => {
        video?.removeEventListener("ended", endedHandlers[index]);
      });
      if (lockedRef.current) unlockScroll();
    };
  }, [clips]);

  return (
    <div ref={wrapperRef} className={`relative h-dvh overflow-hidden ${className ?? ""}`}>
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
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300"
          style={{ opacity: index === activeIndex ? 1 : 0 }}
        />
      ))}
    </div>
  );
}
