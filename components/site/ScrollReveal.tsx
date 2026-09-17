"use client";

import { useEffect, useRef, useState } from "react";

export function ScrollReveal({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(() => typeof IntersectionObserver === "undefined");

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`scroll-reveal ${revealed ? "revealed" : ""}`}>
      {children}
    </div>
  );
}
