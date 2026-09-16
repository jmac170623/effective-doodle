import { PreviewClient } from "@/components/preview/PreviewClient";

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PreviewClient siteId={id} />;
}
