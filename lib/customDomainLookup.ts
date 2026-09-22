/**
 * Edge-safe (fetch-only, no Node APIs) lookup from an incoming request's
 * Host header to the site it should serve. Used by proxy.ts to route a
 * connected/purchased custom domain to the matching /site/[id] page
 * without the visitor ever seeing that internal path.
 *
 * Uses Supabase's REST API directly with the anon key rather than the
 * @supabase/ssr client, since this only needs one unauthenticated read and
 * the existing "Public can view published sites" RLS policy already
 * permits it — no service-role key needed here.
 */
export async function resolveSiteIdForHost(host: string): Promise<string | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return null;

  const url = `${supabaseUrl}/rest/v1/sites?select=id&custom_domain=eq.${encodeURIComponent(host)}&status=eq.published&limit=1`;

  try {
    const res = await fetch(url, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as { id: string }[];
    return rows[0]?.id ?? null;
  } catch {
    return null;
  }
}
