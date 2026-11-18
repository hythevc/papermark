export type RequestAssignment = {
  viewerId?: string | null;
  groupId?: string | null;
  linkId?: string | null;
  email?: string | null;
};

export type ViewerAssignmentIdentity = {
  viewerId: string;
  email: string | null;
  linkId: string;
  groupIds: Set<string>;
};

export function isViewerAssigned(
  assignments: readonly RequestAssignment[],
  identity: ViewerAssignmentIdentity,
): boolean {
  return assignments.some((assignment) => {
    const targets = [
      assignment.viewerId,
      assignment.groupId,
      assignment.linkId,
      assignment.email,
    ].filter(Boolean);
    if (targets.length !== 1) return false;
    if (assignment.viewerId) return assignment.viewerId === identity.viewerId;
    if (assignment.groupId) return identity.groupIds.has(assignment.groupId);
    if (assignment.linkId) return assignment.linkId === identity.linkId;
    return (
      !!identity.email &&
      assignment.email?.trim().toLowerCase() ===
        identity.email.trim().toLowerCase()
    );
  });
}
