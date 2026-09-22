import type { SupabaseClient } from "@supabase/supabase-js";
import { AnimationStatus, BillingStatus, FeedbackRound, GeneratedSite, HeroStage, OnboardingData, QuoteBreakdown, SiteAnimation, SiteImage, SiteRecord, SiteStatus } from "./types";

interface SiteRow {
  id: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  status: SiteStatus;
  onboarding: OnboardingData;
  generated: GeneratedSite;
  feedback_history: FeedbackRound[];
  billing_status: BillingStatus;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  animation_credits: number;
  edit_credits: number;
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
    billingStatus: row.billing_status,
    stripeCustomerId: row.stripe_customer_id ?? undefined,
    stripeSubscriptionId: row.stripe_subscription_id ?? undefined,
    animationCredits: row.animation_credits,
    editCredits: row.edit_credits,
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
    billing_status: record.billingStatus,
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

// Cascades to site_images, site_hero_stages, site_animations, quotes, and
// leads via ON DELETE CASCADE. Storage objects (gallery photos) live
// outside Postgres and must be cleaned up separately by the caller.
export async function deleteSite(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("sites").delete().eq("id", id);
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

export async function activateSiteBilling(
  supabase: SupabaseClient,
  params: { siteId: string; stripeCustomerId: string; stripeSubscriptionId: string }
): Promise<void> {
  const { error } = await supabase
    .from("sites")
    .update({
      billing_status: "active",
      status: "published",
      stripe_customer_id: params.stripeCustomerId,
      stripe_subscription_id: params.stripeSubscriptionId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.siteId);
  if (error) throw new Error(error.message);
}

export async function updateBillingStatusBySubscription(
  supabase: SupabaseClient,
  params: { stripeSubscriptionId: string; billingStatus: BillingStatus; unpublish: boolean }
): Promise<void> {
  const update: Record<string, unknown> = {
    billing_status: params.billingStatus,
    updated_at: new Date().toISOString(),
  };
  if (params.unpublish) {
    update.status = "draft";
  }
  const { error } = await supabase
    .from("sites")
    .update(update)
    .eq("stripe_subscription_id", params.stripeSubscriptionId);
  if (error) throw new Error(error.message);
}

interface SiteImageRow {
  id: string;
  site_id: string;
  url: string;
  caption: string | null;
  sort_order: number;
  created_at: string;
}

function rowToSiteImage(row: SiteImageRow): SiteImage {
  return {
    id: row.id,
    siteId: row.site_id,
    url: row.url,
    caption: row.caption ?? undefined,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

export async function listSiteImages(supabase: SupabaseClient, siteId: string): Promise<SiteImage[]> {
  const { data, error } = await supabase
    .from("site_images")
    .select("*")
    .eq("site_id", siteId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as SiteImageRow[] | null ?? []).map(rowToSiteImage);
}

export async function insertSiteImage(
  supabase: SupabaseClient,
  image: { id: string; siteId: string; url: string; caption?: string; sortOrder: number }
): Promise<void> {
  const { error } = await supabase.from("site_images").insert({
    id: image.id,
    site_id: image.siteId,
    url: image.url,
    caption: image.caption,
    sort_order: image.sortOrder,
  });
  if (error) throw new Error(error.message);
}

export async function deleteSiteImage(supabase: SupabaseClient, imageId: string): Promise<void> {
  const { error } = await supabase.from("site_images").delete().eq("id", imageId);
  if (error) throw new Error(error.message);
}

interface HeroStageRow {
  id: string;
  site_id: string;
  url: string;
  stage_order: number;
  created_at: string;
}

function rowToHeroStage(row: HeroStageRow): HeroStage {
  return {
    id: row.id,
    siteId: row.site_id,
    url: row.url,
    stageOrder: row.stage_order,
    createdAt: row.created_at,
  };
}

export async function listHeroStages(supabase: SupabaseClient, siteId: string): Promise<HeroStage[]> {
  const { data, error } = await supabase
    .from("site_hero_stages")
    .select("*")
    .eq("site_id", siteId)
    .order("stage_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as HeroStageRow[] | null ?? []).map(rowToHeroStage);
}

export async function insertHeroStage(
  supabase: SupabaseClient,
  stage: { id: string; siteId: string; url: string; stageOrder: number }
): Promise<void> {
  const { error } = await supabase.from("site_hero_stages").insert({
    id: stage.id,
    site_id: stage.siteId,
    url: stage.url,
    stage_order: stage.stageOrder,
  });
  if (error) throw new Error(error.message);
}

export async function deleteHeroStage(supabase: SupabaseClient, stageId: string): Promise<void> {
  const { error } = await supabase.from("site_hero_stages").delete().eq("id", stageId);
  if (error) throw new Error(error.message);
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

interface SiteAnimationRow {
  id: string;
  site_id: string;
  image_id: string | null;
  is_hero: boolean;
  status: AnimationStatus;
  video_url: string | null;
  used_credit: boolean;
  created_at: string;
}

function rowToSiteAnimation(row: SiteAnimationRow): SiteAnimation {
  return {
    id: row.id,
    siteId: row.site_id,
    imageId: row.image_id ?? undefined,
    isHero: row.is_hero,
    status: row.status,
    videoUrl: row.video_url ?? undefined,
    usedCredit: row.used_credit,
    createdAt: row.created_at,
  };
}

export async function listSiteAnimations(supabase: SupabaseClient, siteId: string): Promise<SiteAnimation[]> {
  const { data, error } = await supabase
    .from("site_animations")
    .select("*")
    .eq("site_id", siteId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as SiteAnimationRow[] | null ?? []).map(rowToSiteAnimation);
}

export async function insertSiteAnimation(
  supabase: SupabaseClient,
  animation: { id: string; siteId: string; imageId?: string; isHero?: boolean; usedCredit: boolean }
): Promise<void> {
  const { error } = await supabase.from("site_animations").insert({
    id: animation.id,
    site_id: animation.siteId,
    image_id: animation.imageId,
    is_hero: animation.isHero ?? false,
    status: "processing",
    used_credit: animation.usedCredit,
  });
  if (error) throw new Error(error.message);
}

export async function updateSiteAnimationStatus(
  supabase: SupabaseClient,
  params: { id: string; status: AnimationStatus; videoUrl?: string }
): Promise<void> {
  const { error } = await supabase
    .from("site_animations")
    .update({ status: params.status, video_url: params.videoUrl })
    .eq("id", params.id);
  if (error) throw new Error(error.message);
}

// Consumes one purchased animation credit — called when an animation is
// created past the free cap. Not run inside a DB transaction; a rare race
// between two simultaneous requests could both pass the eligibility check
// and this would let the balance go negative, which is an acceptable MVP
// tradeoff for a single-user-per-site dashboard.
export async function consumeAnimationCredit(supabase: SupabaseClient, siteId: string, currentCredits: number): Promise<void> {
  const { error } = await supabase
    .from("sites")
    .update({ animation_credits: Math.max(0, currentCredits - 1) })
    .eq("id", siteId);
  if (error) throw new Error(error.message);
}

// Called by the Stripe webhook (service-role client) after a successful
// one-time animation-credit payment.
export async function addAnimationCredits(supabase: SupabaseClient, siteId: string, count: number): Promise<void> {
  const { error } = await supabase.rpc("increment_animation_credits", { p_site_id: siteId, p_count: count });
  if (error) throw new Error(error.message);
}

// Consumes one purchased AI-edit credit — called when a feedback edit is
// applied past the free cap (see lib/editLimits.ts).
export async function consumeEditCredit(supabase: SupabaseClient, siteId: string, currentCredits: number): Promise<void> {
  const { error } = await supabase
    .from("sites")
    .update({ edit_credits: Math.max(0, currentCredits - 1) })
    .eq("id", siteId);
  if (error) throw new Error(error.message);
}

// Called by the Stripe webhook (service-role client) after a successful
// one-time edit-credit payment.
export async function addEditCredits(supabase: SupabaseClient, siteId: string, count: number): Promise<void> {
  const { error } = await supabase.rpc("increment_edit_credits", { p_site_id: siteId, p_count: count });
  if (error) throw new Error(error.message);
}
