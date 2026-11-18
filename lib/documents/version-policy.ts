import { hasAllPermissions } from "@/lib/api/rbac/permissions";
import { tokenHasScope } from "@/lib/oauth/scopes";

export function canCreateDocumentVersion(
  membership: {
    role: string;
    status: string;
    blockedAt: Date | null;
  } | null,
): boolean {
  return (
    !!membership &&
    membership.status === "ACTIVE" &&
    !membership.blockedAt &&
    hasAllPermissions(membership.role, ["documents.write"])
  );
}

export function authorizeVersionToken(
  token: {
    teamId: string;
    expires: Date | null;
    scopes: string | null;
  } | null,
  teamId: string,
  now = new Date(),
): "allowed" | "unauthorized" | "forbidden" {
  if (
    !token ||
    token.teamId !== teamId ||
    (token.expires && token.expires <= now)
  )
    return "unauthorized";
  return tokenHasScope(token.scopes, "documents.write")
    ? "allowed"
    : "forbidden";
}
