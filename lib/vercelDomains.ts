/**
 * Real Vercel Domains Registrar + project-domain REST API integration.
 *
 * Verified against Vercel's own documentation (vercel.com/docs/rest-api)
 * and, where possible, live calls during development — not guessed:
 *  - GET  /v1/registrar/domains/{domain}/availability
 *  - GET  /v1/registrar/domains/{domain}/price   (confirmed live shape:
 *    { years, purchasePrice, renewalPrice, transferPrice })
 *  - POST /v1/registrar/domains/{domain}/buy
 *  - GET  /v1/registrar/orders/{orderId}
 *  - POST /v10/projects/{idOrName}/domains        (attach to project)
 *  - GET  /v6/domains/{domain}/config             (DNS/verification status)
 *
 * Important real-world constraint found during development: Vercel's
 * registrar does NOT support UK ccTLDs (.uk or .co.uk) — confirmed via a
 * live 400 `tld_not_supported` response for both. .com/.net/.org/etc. work
 * fine. UK tradespeople who specifically want a .co.uk have to bring their
 * own (the "connect a domain you already own" flow) rather than buy one
 * through this integration.
 *
 * All purchase-related calls spend real money on whichever Vercel
 * account/card VERCEL_API_TOKEN belongs to — see README for the full
 * money-flow explanation before enabling this in production.
 */

const VERCEL_API_BASE = "https://api.vercel.com";

function requireToken(): string {
  const token = process.env.VERCEL_API_TOKEN;
  if (!token) throw new Error("VERCEL_API_TOKEN is not configured.");
  return token;
}

function teamQuery(): string {
  return process.env.VERCEL_TEAM_ID ? `teamId=${encodeURIComponent(process.env.VERCEL_TEAM_ID)}` : "";
}

function withQuery(path: string, extra: Record<string, string | undefined> = {}): string {
  const params = new URLSearchParams();
  const team = teamQuery();
  if (team) {
    const [key, value] = team.split("=");
    params.set(key, decodeURIComponent(value));
  }
  for (const [key, value] of Object.entries(extra)) {
    if (value !== undefined) params.set(key, value);
  }
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

async function vercelFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${VERCEL_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${requireToken()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.error?.message || data?.message || `Vercel API request failed (${res.status}).`;
    throw new Error(message);
  }
  return data as T;
}

export async function checkDomainAvailability(domain: string): Promise<boolean> {
  const data = await vercelFetch<{ available: boolean }>(
    withQuery(`/v1/registrar/domains/${encodeURIComponent(domain)}/availability`)
  );
  return data.available;
}

export interface DomainPrice {
  years: number;
  purchasePriceUsd: number;
  renewalPriceUsd: number;
}

export async function getDomainPrice(domain: string, years = 1): Promise<DomainPrice> {
  const data = await vercelFetch<{ years: number; purchasePrice: number; renewalPrice: number }>(
    withQuery(`/v1/registrar/domains/${encodeURIComponent(domain)}/price`, { years: String(years) })
  );
  return { years: data.years, purchasePriceUsd: data.purchasePrice, renewalPriceUsd: data.renewalPrice };
}

export interface RegistrantContact {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address1: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface BuyDomainResult {
  orderId?: string;
  domain: string;
}

/**
 * Executes a real, non-refundable domain purchase — charges whatever card
 * is on file for the Vercel account VERCEL_API_TOKEN belongs to. Only call
 * this after payment has already been collected from the end customer.
 */
export async function buyDomain(params: {
  domain: string;
  years: number;
  expectedPriceUsd: number;
  contact: RegistrantContact;
}): Promise<BuyDomainResult> {
  const data = await vercelFetch<{ orderId?: string; domain?: string }>(
    withQuery(`/v1/registrar/domains/${encodeURIComponent(params.domain)}/buy`),
    {
      method: "POST",
      body: JSON.stringify({
        autoRenew: false,
        years: params.years,
        expectedPrice: params.expectedPriceUsd,
        contactInformation: params.contact,
      }),
    }
  );
  return { orderId: data.orderId, domain: data.domain ?? params.domain };
}

export interface AddDomainResult {
  verified: boolean;
  verification?: { type: string; domain: string; value: string; reason: string }[];
}

/**
 * Attaches a domain (already owned, or just purchased) to this project so
 * Vercel starts serving it. If `verified` comes back false, `verification`
 * lists the exact DNS records Vercel needs to see before it'll route
 * traffic — pass these straight through to the customer rather than
 * guessing generic A/CNAME instructions, since the exact requirement can
 * differ.
 */
export async function addDomainToProject(domain: string): Promise<AddDomainResult> {
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!projectId) throw new Error("VERCEL_PROJECT_ID is not configured.");
  const data = await vercelFetch<{ verified: boolean; verification?: AddDomainResult["verification"] }>(
    withQuery(`/v10/projects/${encodeURIComponent(projectId)}/domains`),
    { method: "POST", body: JSON.stringify({ name: domain }) }
  );
  return { verified: data.verified, verification: data.verification };
}

export interface DomainConfigStatus {
  misconfigured: boolean;
}

export async function getDomainConfig(domain: string): Promise<DomainConfigStatus> {
  const data = await vercelFetch<{ misconfigured: boolean }>(
    withQuery(`/v6/domains/${encodeURIComponent(domain)}/config`)
  );
  return { misconfigured: data.misconfigured };
}
