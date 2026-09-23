"use client";

import { useEffect, useState } from "react";

const SLIDE_DURATION_MS = 4500;

// Fallback for when a site has multiple hero stage photos but hasn't
// generated stage animations yet — a slow crossfade slideshow across the
// stages so uploading a before/during/after sequence visibly does
// something, instead of only ever showing the last photo as a static
// background.
const FADE_DURATION_MS = 1000;

export function HeroStageSlideshow({ urls, className }: { urls: string[]; className?: string }) {
  const [index, setIndex] = useState(0);
  // The photo fading out during a transition — kept mounted only long
  // enough to finish its fade, so at most two full-resolution stage photos
  // (these are raw, unresized uploads) are ever decoded at once instead of
  // all of them simultaneously. Stacking every stage as a permanently
  // mounted <img> was crashing the tab on sites with several stage photos.
  const [prevIndex, setPrevIndex] = useState<number | null>(null);

  useEffect(() => {
    if (urls.length < 2) return;
    const interval = setInterval(() => {
      setIndex((i) => {
        setPrevIndex(i);
        return (i + 1) % urls.length;
      });
    }, SLIDE_DURATION_MS);
    return () => clearInterval(interval);
  }, [urls.length]);

  useEffect(() => {
    if (prevIndex === null) return;
    const timeout = setTimeout(() => setPrevIndex(null), FADE_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [prevIndex]);

  const mountedIndices = prevIndex === null ? [index] : [prevIndex, index];

  return (
    <div className={className}>
      {mountedIndices.map((i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={urls[i]}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-in-out"
          style={{ opacity: i === index ? 1 : 0 }}
        />
      ))}
    </div>
  );
}
