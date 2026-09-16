"use client";

import { FormEvent, useState } from "react";
import { FeedbackRound, SiteRecord } from "@/lib/types";

export function FeedbackPanel({
  siteId,
  feedbackHistory,
  onUpdated,
}: {
  siteId: string;
  feedbackHistory: FeedbackRound[];
  onUpdated: (site: SiteRecord) => void;
}) {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!message.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/sites/${siteId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to apply feedback.");
      }
      const updated = await res.json();
      onUpdated(updated);
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply feedback.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Anything you don&apos;t like or want changed?</h2>
      <p className="mt-1 text-sm text-slate-500">
        Tell us in plain English — e.g. &quot;make it feel more professional&quot;, &quot;too much blue&quot;, or &quot;shorten the about section&quot;. We&apos;ll update the preview above.
      </p>
      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <textarea
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your feedback here…"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting || !message.trim()}
          className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          {submitting ? "Updating…" : "Update My Site"}
        </button>
      </form>

      {feedbackHistory.length > 0 && (
        <div className="mt-6 border-t border-slate-100 pt-4">
          <p className="text-sm font-medium text-slate-700">Revision history</p>
          <ul className="mt-2 space-y-3">
            {feedbackHistory
              .slice()
              .reverse()
              .map((round) => (
                <li key={round.id} className="text-sm">
                  <p className="text-slate-600">&quot;{round.message}&quot;</p>
                  <ul className="mt-1 list-inside list-disc text-xs text-slate-500">
                    {round.adjustmentsSummary.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
