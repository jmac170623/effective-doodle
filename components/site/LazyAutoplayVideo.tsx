"use client";

import { useEffect, useRef, useState } from "react";

// Gallery animations were all mounted with autoPlay and no preload limit —
// every completed animation on a site started downloading, decoding, and
// playing simultaneously the instant the page rendered, regardless of
// scroll position. Combined with several full-size gallery photos loading
// eagerly at the same time, that's enough to crash the tab on a site with
// more than a couple of animated photos. This only loads/plays once the
// video is actually (near) visible, and pauses again once it isn't.
export function LazyAutoplayVideo({
  src,
  poster,
  className,
}: {
  src: string;
  poster?: string;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      rootMargin: "200px",
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (inView) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [inView]);

  return (
    <video
      ref={ref}
      src={inView ? src : undefined}
      poster={poster}
      muted
      loop
      playsInline
      preload="none"
      className={className}
    />
  );
}
