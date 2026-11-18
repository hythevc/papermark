import { RequestListAccessError } from "./access-policy";

/** Use only IDs fetched with a dataroomId filter. Task destinations belong to
 * the host's request and take precedence over the link's generic upload list. */
export function resolveUploadFolder({
  taskFolderId,
  isTaskUpload,
  requestedFolderId,
  allowedFolderIds,
  validFolderIds,
}: {
  taskFolderId?: string | null;
  isTaskUpload: boolean;
  requestedFolderId?: string;
  allowedFolderIds: string[];
  validFolderIds: Set<string>;
}): string | null {
  if (isTaskUpload && taskFolderId) {
    if (!validFolderIds.has(taskFolderId))
      throw new RequestListAccessError(
        403,
        "The request upload folder is not available.",
      );
    return taskFolderId;
  }
  if (allowedFolderIds.length) {
    if (
      requestedFolderId &&
      allowedFolderIds.includes(requestedFolderId) &&
      validFolderIds.has(requestedFolderId)
    )
      return requestedFolderId;
    const fallback = allowedFolderIds.find((id) => validFolderIds.has(id));
    if (!fallback)
      throw new RequestListAccessError(
        403,
        "No permitted upload folder is available.",
      );
    return fallback;
  }
  if (requestedFolderId && !validFolderIds.has(requestedFolderId))
    throw new RequestListAccessError(
      403,
      "This upload folder is not available in this room.",
    );
  return requestedFolderId ?? null;
}
