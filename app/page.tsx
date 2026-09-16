import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-slate-950 px-6 py-24 text-center text-white">
      <p className="text-sm font-semibold uppercase tracking-widest text-slate-400">For tradespeople</p>
      <h1 className="mt-4 max-w-2xl text-4xl font-extrabold leading-tight sm:text-5xl">
        A professional website for your trade business, generated in minutes.
      </h1>
      <p className="mt-4 max-w-xl text-slate-300">
        Answer a few quick questions about your business and how you work — we&apos;ll write the copy, pick a
        style that matches your personality, and build a fully working site you can preview, tweak, and publish.
      </p>
      <Link
        href="/onboarding"
        className="mt-8 rounded-lg bg-white px-8 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100"
      >
        Build My Website
      </Link>
    </main>
  );
}
