import { ManageClient } from "@/components/manage/ManageClient";

export default async function ManagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ManageClient siteId={id} />;
}
