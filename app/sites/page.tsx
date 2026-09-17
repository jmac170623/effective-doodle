import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listSitesForOwner } from "@/lib/db";

export default async function SitesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/sites");
  }

  const sites = await listSitesForOwner(supabase, user.id);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Sites</h1>
            <p className="mt-1 text-sm text-slate-500">{user.email}</p>
          </div>
          <form action="/auth/signout" method="post">
            <button type="submit" className="text-sm font-medium text-slate-500 underline">
              Log out
            </button>
          </form>
        </div>

        <Link
          href="/onboarding"
          className="mt-6 inline-block rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
        >
          + Build a new website
        </Link>

        <div className="mt-8 space-y-3">
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
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
