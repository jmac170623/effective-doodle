// Served when a request arrives on a hostname that isn't connected to any
// published site — e.g. DNS was pointed here before the domain was added
// in the manage dashboard, or a site was deleted after its domain was set
// up. Never falls through to this app's own marketing homepage, which
// would otherwise render under a stranger's domain.
export default function DomainNotConnectedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-slate-900">This domain isn&apos;t connected yet</h1>
        <p className="mt-2 text-sm text-slate-500">
          If you just added this domain, DNS changes can take a few hours to take effect. If this is your domain,
          check its connection status from your site&apos;s manage dashboard.
        </p>
      </div>
    </main>
  );
}
