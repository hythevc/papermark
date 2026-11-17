import type { Prisma } from "@prisma/client";

import type { TaskAssignmentInput } from "./schemas";
import { assignmentKey } from "./schemas";

export class RequestListAdminError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = "RequestListAdminError";
  }
}

type TargetDatabase = Pick<
  Prisma.TransactionClient,
  "viewer" | "viewerGroup" | "link" | "dataroomFolder"
>;

export function assignmentChanges(
  existing: {
    id: string;
    viewerId: string | null;
    groupId: string | null;
    linkId: string | null;
    email: string | null;
  }[],
  desired: TaskAssignmentInput[],
) {
  const existingKey = (assignment: (typeof existing)[number]) => {
    const key = (["viewerId", "groupId", "linkId", "email"] as const).find(
      (field) => assignment[field],
    );
    return key ? `${key}:${assignment[key]}` : "";
  };
  const desiredKeys = new Set(desired.map(assignmentKey));
  const existingKeys = new Set(existing.map(existingKey));
  return {
    removedIds: existing
      .filter((assignment) => !desiredKeys.has(existingKey(assignment)))
      .map((assignment) => assignment.id),
    additions: desired.filter(
      (assignment) => !existingKeys.has(assignmentKey(assignment)),
    ),
  };
}

/** Validate all foreign targets before replacing any persisted assignments. */
export async function validateTaskTargets(
  database: TargetDatabase,
  scope: { teamId: string; dataroomId: string },
  input: {
    assignments?: TaskAssignmentInput[];
    uploadFolderId?: string | null;
  },
) {
  const assignments = input.assignments ?? [];
  const ids = (field: "viewerId" | "groupId" | "linkId") =>
    assignments.flatMap((assignment) =>
      assignment[field] ? [assignment[field]!] : [],
    );
  const viewerIds = ids("viewerId");
  const groupIds = ids("groupId");
  const linkIds = ids("linkId");

  // Viewers are team-global: a visitor may belong to this room directly or
  // through a recorded room view. Neither a different team nor an unrelated
  // viewer in the same team is an eligible target.
  const [viewers, groups, links, folder] = await Promise.all([
    viewerIds.length
      ? database.viewer.findMany({
          where: {
            id: { in: viewerIds },
            teamId: scope.teamId,
            OR: [
              { dataroomId: scope.dataroomId },
              { views: { some: { dataroomId: scope.dataroomId } } },
              {
                groups: {
                  some: {
                    group: {
                      dataroomId: scope.dataroomId,
                      teamId: scope.teamId,
                    },
                  },
                },
              },
            ],
          },
          select: { id: true },
        })
      : [],
    groupIds.length
      ? database.viewerGroup.findMany({
          where: { id: { in: groupIds }, ...scope },
          select: { id: true },
        })
      : [],
    linkIds.length
      ? database.link.findMany({
          where: {
            id: { in: linkIds },
            ...scope,
            linkType: "DATAROOM_LINK",
            deletedAt: null,
          },
          select: { id: true },
        })
      : [],
    input.uploadFolderId
      ? database.dataroomFolder.findFirst({
          where: {
            id: input.uploadFolderId,
            dataroomId: scope.dataroomId,
            dataroom: { teamId: scope.teamId },
          },
          select: { id: true },
        })
      : null,
  ]);

  if (
    viewers.length !== viewerIds.length ||
    groups.length !== groupIds.length ||
    links.length !== linkIds.length
  ) {
    throw new RequestListAdminError(
      400,
      "Every assignee must belong to this data room.",
    );
  }
  if (input.uploadFolderId && !folder) {
    throw new RequestListAdminError(
      400,
      "Choose an upload destination in this data room.",
    );
  }
}
