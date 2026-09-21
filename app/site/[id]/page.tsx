import { notFound } from "next/navigation";
import { getSite, listHeroStages, listSiteAnimations, listSiteImages } from "@/lib/db";
import { SiteRenderer } from "@/components/site/SiteRenderer";
import { createClient } from "@/lib/supabase/server";

export default async function PublishedSitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const site = await getSite(supabase, id);

  if (!site || site.status !== "published") {
    notFound();
  }

  const [images, animations, heroStages] = await Promise.all([
    listSiteImages(supabase, id),
    listSiteAnimations(supabase, id),
    listHeroStages(supabase, id),
  ]);

  return (
    <SiteRenderer
      siteId={site.id}
      onboarding={site.onboarding}
      generated={site.generated}
      images={images}
      animations={animations}
      heroStages={heroStages}
    />
  );
}
