import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listSitesForOwner } from "@/lib/db";
import { SitesListClient } from "@/components/sites/SitesListClient";

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

        <SitesListClient initialSites={sites} />
      </div>
    </main>
  );
}
