"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteRecord } from "@/lib/types";

export function SitesListClient({ initialSites }: { initialSites: SiteRecord[] }) {
  const router = useRouter();
  const [sites, setSites] = useState(initialSites);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handleDelete(site: SiteRecord) {
    const billingNote =
      site.billingStatus === "active" || site.billingStatus === "past_due"
        ? ", and cancels its £35/mo subscription"
        : "";
    const confirmed = window.confirm(
      `Delete "${site.onboarding.businessName}"? This permanently deletes the site, its photos, and its quote history${billingNote}. This can't be undone.`
    );
    if (!confirmed) return;

    setError("");
    setDeletingId(site.id);
    try {
      const res = await fetch(`/api/sites/${site.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Couldn't delete this site.");
      }
      setSites((prev) => prev.filter((s) => s.id !== site.id));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete this site.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mt-8 space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}

      {sites.length === 0 && (
        <p className="text-sm text-slate-500">You haven&apos;t built a website yet.</p>
      )}

      {sites.map((site) => (
        <div
          key={site.id}
          className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
        >
          <div>
            <p className="font-semibold text-slate-900">{site.onboarding.businessName}</p>
            <p className="text-xs text-slate-500">
              {site.status === "published" ? "Published" : "Draft"} · updated{" "}
              {new Date(site.updatedAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href={site.status === "published" ? `/site/${site.id}` : `/preview/${site.id}`}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-400"
            >
              {site.status === "published" ? "View live site" : "Continue editing"}
            </Link>
            <Link
              href={`/manage/${site.id}`}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-400"
            >
              Manage
            </Link>
            <button
              type="button"
              onClick={() => handleDelete(site)}
              disabled={deletingId === site.id}
              className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:border-red-400 disabled:opacity-50"
            >
              {deletingId === site.id ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
