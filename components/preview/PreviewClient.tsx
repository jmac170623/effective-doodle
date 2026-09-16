"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SiteRecord } from "@/lib/types";
import { TONE_PROFILES } from "@/lib/toneProfiles";
import { SiteRenderer } from "@/components/site/SiteRenderer";
import { FeedbackPanel } from "./FeedbackPanel";

export function PreviewClient({ siteId }: { siteId: string }) {
  const router = useRouter();
  const [site, setSite] = useState<SiteRecord | null>(null);
  const [loadError, setLoadError] = useState("");
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/sites/${siteId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Site not found.");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setSite(data);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Failed to load site.");
      });
    return () => {
      cancelled = true;
    };
  }, [siteId]);

  async function handlePublish() {
    if (!site) return;
    setPublishing(true);
    try {
      const res = await fetch(`/api/sites/${siteId}/publish`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to publish.");
      router.push(`/site/${siteId}`);
    } catch (err) {
      setPublishing(false);
      setLoadError(err instanceof Error ? err.message : "Failed to publish.");
    }
  }

  if (loadError) {
    return <div className="p-12 text-center text-red-600">{loadError}</div>;
  }

  if (!site) {
    return <div className="p-12 text-center text-slate-500">Loading your preview…</div>;
  }

  const toneLabel = TONE_PROFILES[site.generated.toneProfile].label;

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Preview — {site.onboarding.businessName}</p>
            <p className="text-xs text-slate-500">Detected style: {toneLabel}. Not published yet.</p>
          </div>
          <button
            type="button"
            onClick={handlePublish}
            disabled={publishing}
            className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {publishing ? "Publishing…" : "Publish Website"}
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-5xl border-x border-slate-200 bg-white shadow-sm">
        <SiteRenderer siteId={site.id} onboarding={site.onboarding} generated={site.generated} />
      </div>

      <div className="mx-auto max-w-5xl px-6 py-10">
        <FeedbackPanel siteId={siteId} feedbackHistory={site.feedbackHistory} onUpdated={setSite} />
      </div>
    </div>
  );
}
