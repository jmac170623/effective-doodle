import type { SupabaseClient } from "@supabase/supabase-js";
import { FeedbackRound, GeneratedSite, OnboardingData, QuoteBreakdown, SiteRecord, SiteStatus } from "./types";

interface SiteRow {
  id: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  status: SiteStatus;
  onboarding: OnboardingData;
  generated: GeneratedSite;
  feedback_history: FeedbackRound[];
}

function rowToRecord(row: SiteRow): SiteRecord {
  return {
    id: row.id,
    ownerId: row.owner_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: row.status,
    onboarding: row.onboarding,
    generated: row.generated,
    feedbackHistory: row.feedback_history,
  };
}

export async function insertSite(supabase: SupabaseClient, record: SiteRecord): Promise<void> {
  const { error } = await supabase.from("sites").insert({
    id: record.id,
    owner_id: record.ownerId,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
    status: record.status,
    onboarding: record.onboarding,
    generated: record.generated,
    feedback_history: record.feedbackHistory,
  });
  if (error) throw new Error(error.message);
}

export async function getSite(supabase: SupabaseClient, id: string): Promise<SiteRecord | null> {
  const { data, error } = await supabase.from("sites").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? rowToRecord(data as SiteRow) : null;
}

export async function updateSite(supabase: SupabaseClient, record: SiteRecord): Promise<void> {
  const { error } = await supabase
    .from("sites")
    .update({
      updated_at: record.updatedAt,
      status: record.status,
      onboarding: record.onboarding,
      generated: record.generated,
      feedback_history: record.feedbackHistory,
    })
    .eq("id", record.id);
  if (error) throw new Error(error.message);
}

export async function listSitesForOwner(supabase: SupabaseClient, ownerId: string): Promise<SiteRecord[]> {
  const { data, error } = await supabase
    .from("sites")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as SiteRow[] | null ?? []).map(rowToRecord);
}

export async function insertLead(
  supabase: SupabaseClient,
  lead: { id: string; siteId: string; createdAt: string; name: string; email: string; message: string }
): Promise<void> {
  const { error } = await supabase.from("leads").insert({
    id: lead.id,
    site_id: lead.siteId,
    created_at: lead.createdAt,
    name: lead.name,
    email: lead.email,
    message: lead.message,
  });
  if (error) throw new Error(error.message);
}

export async function insertQuote(
  supabase: SupabaseClient,
  quote: {
    id: string;
    siteId: string;
    createdAt: string;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    serviceName: string;
    breakdown: QuoteBreakdown;
  }
): Promise<void> {
  const { error } = await supabase.from("quotes").insert({
    id: quote.id,
    site_id: quote.siteId,
    created_at: quote.createdAt,
    customer_name: quote.customerName,
    customer_email: quote.customerEmail,
    customer_phone: quote.customerPhone,
    service_name: quote.serviceName,
    breakdown: quote.breakdown,
  });
  if (error) throw new Error(error.message);
}
