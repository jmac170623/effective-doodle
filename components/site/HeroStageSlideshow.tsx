"use client";

import { useEffect, useState } from "react";

const SLIDE_DURATION_MS = 4500;

// Fallback for when a site has multiple hero stage photos but no
// transformation video yet (animateHeroTransformation is still a stub) — a
// slow crossfade slideshow across the stages so uploading a before/during/
// after sequence visibly does something, instead of only ever showing the
// last photo as a static background.
export function HeroStageSlideshow({ urls, className }: { urls: string[]; className?: string }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (urls.length < 2) return;
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % urls.length);
    }, SLIDE_DURATION_MS);
    return () => clearInterval(interval);
  }, [urls.length]);

  return (
    <div className={className}>
      {urls.map((url, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={url}
          src={url}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-in-out"
          style={{ opacity: i === index ? 1 : 0 }}
        />
      ))}
    </div>
  );
}
