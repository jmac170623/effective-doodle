"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SiteRecord } from "@/lib/types";
import { TONE_PROFILES } from "@/lib/toneProfiles";
import { SiteRenderer } from "@/components/site/SiteRenderer";
import { FeedbackPanel } from "./FeedbackPanel";

function PreviewClientInner({ siteId }: { siteId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [site, setSite] = useState<SiteRecord | null>(null);
  const [loadError, setLoadError] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [pollExhausted, setPollExhausted] = useState(false);
  const pollAttempts = useRef(0);

  const checkoutResult = searchParams.get("checkout");

  async function loadSite() {
    const res = await fetch(`/api/sites/${siteId}`);
    if (!res.ok) throw new Error("Site not found.");
    return (await res.json()) as SiteRecord;
  }

  useEffect(() => {
    let cancelled = false;
    loadSite()
      .then((data) => {
        if (!cancelled) setSite(data);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Failed to load site.");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  // After returning from Stripe Checkout, the webhook activates billing
  // asynchronously — poll briefly until it lands rather than showing stale state.
  const activating = checkoutResult === "success" && site !== null && site.billingStatus !== "active" && !pollExhausted;

  useEffect(() => {
    if (!activating) return;
    const interval = setInterval(async () => {
      pollAttempts.current += 1;
      try {
        const updated = await loadSite();
        setSite(updated);
        if (updated.billingStatus === "active") {
          clearInterval(interval);
        } else if (pollAttempts.current >= 10) {
          setPollExhausted(true);
          clearInterval(interval);
        }
      } catch {
        // keep polling silently
      }
    }, 2000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activating]);

  async function handlePublish() {
    if (!site) return;
    setPublishing(true);
    try {
      if (site.billingStatus === "active") {
        const res = await fetch(`/api/sites/${siteId}/publish`, { method: "POST" });
        if (!res.ok) throw new Error("Failed to publish.");
        router.push(`/site/${siteId}`);
        return;
      }

      const res = await fetch(`/api/sites/${siteId}/checkout`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to start checkout.");
      }
      const { url } = await res.json();
      window.location.href = url;
    } catch (err) {
      setPublishing(false);
      setLoadError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (loadError) {
    return <div className="p-12 text-center text-red-600">{loadError}</div>;
  }

  if (!site) {
    return <div className="p-12 text-center text-slate-500">Loading your preview…</div>;
  }

  const toneLabel = TONE_PROFILES[site.generated.toneProfile].label;
  const isActive = site.billingStatus === "active";

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Preview — {site.onboarding.businessName}</p>
            <p className="text-xs text-slate-500">
              Detected style: {toneLabel}. {site.status === "published" ? "Published." : "Not published yet."}
            </p>
          </div>
          <button
            type="button"
            onClick={handlePublish}
            disabled={publishing || activating}
            className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {activating
              ? "Activating…"
              : publishing
              ? isActive
                ? "Publishing…"
                : "Redirecting to checkout…"
              : isActive
              ? "Publish Website"
              : "Publish Website — £35/mo"}
          </button>
        </div>
        {checkoutResult === "cancelled" && (
          <p className="mx-auto mt-2 max-w-5xl text-sm text-amber-600">
            Checkout was cancelled — no charge was made. You can try again anytime.
          </p>
        )}
        {activating && (
          <p className="mx-auto mt-2 max-w-5xl text-sm text-emerald-600">
            Payment received — activating your site…
          </p>
        )}
      </div>

      <div className="mx-auto max-w-5xl border-x border-slate-200 bg-white shadow-sm">
        <SiteRenderer siteId={site.id} onboarding={site.onboarding} generated={site.generated} images={site.images ?? []} />
      </div>

      <div className="mx-auto max-w-5xl px-6 py-10">
        <FeedbackPanel siteId={siteId} feedbackHistory={site.feedbackHistory} onUpdated={setSite} />
      </div>
    </div>
  );
}

export function PreviewClient({ siteId }: { siteId: string }) {
  return (
    <Suspense>
      <PreviewClientInner siteId={siteId} />
    </Suspense>
  );
}
