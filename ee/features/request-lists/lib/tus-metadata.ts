/** @tus/server assigns an ID before onIncomingRequest on POST, but does not
 * persist the new upload until afterwards. Only resumed requests can load it. */
export async function resolveTusIdentityMetadata({
  method,
  uploadId,
  metadataHeader,
  loadMetadata,
}: {
  method?: string;
  uploadId?: string;
  metadataHeader?: string | string[];
  loadMetadata: (
    id: string,
  ) => Promise<Record<string, string | null | undefined>>;
}) {
  if (method === "POST") {
    const value = Array.isArray(metadataHeader)
      ? metadataHeader[0]
      : metadataHeader;
    if (!value) throw new Error("Missing upload metadata");
    const metadata: Record<string, string> = {};
    for (const item of value.split(",")) {
      const [key, encoded] = item.trim().split(" ");
      if (key && encoded)
        metadata[key] = Buffer.from(encoded, "base64").toString();
    }
    return metadata;
  }
  if (!uploadId) throw new Error("Upload identity is required");
  const metadata: Record<string, string> = {};
  for (const [key, value] of Object.entries(await loadMetadata(uploadId))) {
    if (typeof value === "string") metadata[key] = value;
  }
  return metadata;
}
