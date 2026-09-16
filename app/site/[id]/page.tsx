import { notFound } from "next/navigation";
import { getSite } from "@/lib/db";
import { SiteRenderer } from "@/components/site/SiteRenderer";

export default async function PublishedSitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const site = getSite(id);

  if (!site || site.status !== "published") {
    notFound();
  }

  return <SiteRenderer siteId={site.id} onboarding={site.onboarding} generated={site.generated} />;
}
