import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex flex-1 flex-col bg-slate-950 text-white">
      <nav className="flex items-center justify-end gap-4 px-6 py-6 text-sm">
        {user ? (
          <Link href="/sites" className="font-medium text-white hover:text-slate-300">
            My Sites
          </Link>
        ) : (
          <>
            <Link href="/login" className="font-medium text-slate-300 hover:text-white">
              Log in
            </Link>
            <Link href="/signup" className="font-medium text-white hover:text-slate-300">
              Sign up
            </Link>
          </>
        )}
      </nav>

      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-slate-400">For tradespeople</p>
        <h1 className="mt-4 max-w-2xl text-4xl font-extrabold leading-tight sm:text-5xl">
          A professional website for your trade business, generated in minutes.
        </h1>
        <p className="mt-4 max-w-xl text-slate-300">
          Answer a few quick questions about your business and how you work — we&apos;ll write the copy, pick a
          style that matches your personality, and build a fully working site you can preview, tweak, and publish.
        </p>
        <Link
          href={user ? "/onboarding" : "/signup"}
          className="mt-8 rounded-lg bg-white px-8 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100"
        >
          Build My Website
        </Link>
      </div>
    </main>
  );
}
