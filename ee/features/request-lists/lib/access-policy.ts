export class RequestListAccessError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = "access-denied",
  ) {
    super(message);
  }
}

type SessionIdentity = {
  linkId: string;
  dataroomId: string;
  viewId: string;
  viewerId?: string;
  verified: boolean;
  expiresAt: number;
};

type RequestLink = {
  id: string;
  dataroomId: string | null;
  teamId: string | null;
  isArchived: boolean;
  deletedAt: Date | null;
  expiresAt: Date | null;
};

export function assertRequestLinkAccess(
  session: SessionIdentity | null,
  link: RequestLink | null,
  linkId: string,
  dataroomId: string,
  now = Date.now(),
): asserts session is SessionIdentity & { viewerId: string } {
  assertUploadLinkAccess(session, link, linkId, dataroomId, now);
  if (!session.verified) {
    throw new RequestListAccessError(
      401,
      "Verify your email to view assigned requests.",
    );
  }
}

export function assertUploadLinkAccess(
  session: SessionIdentity | null,
  link: RequestLink | null,
  linkId: string,
  dataroomId: string,
  now = Date.now(),
): asserts session is SessionIdentity & { viewerId: string } {
  if (!session?.viewerId || session.expiresAt <= now) {
    throw new RequestListAccessError(
      401,
      "Your sharing session has expired. Open the sharing link again.",
    );
  }
  if (
    session.linkId !== linkId ||
    session.dataroomId !== dataroomId ||
    !session.viewId
  ) {
    throw new RequestListAccessError(
      403,
      "This session cannot access these requests.",
    );
  }
  if (
    !link?.teamId ||
    link.id !== linkId ||
    link.dataroomId !== dataroomId ||
    link.isArchived ||
    link.deletedAt ||
    (link.expiresAt && link.expiresAt.getTime() <= now)
  ) {
    throw new RequestListAccessError(
      403,
      "This sharing link is no longer available.",
    );
  }
}

export function assertViewerTaskAction(
  task: { status: string; type: string },
  status?: string,
  hasUpload = false,
) {
  if (task.status === "COMPLETED" && status) {
    throw new RequestListAccessError(
      403,
      "The host has completed this request.",
    );
  }
  if (status && status !== "IN_PROGRESS" && status !== "SUBMITTED") {
    throw new RequestListAccessError(
      403,
      "Only the host can complete a request.",
    );
  }
  if (status === "SUBMITTED" && task.type === "UPLOAD" && !hasUpload) {
    throw new RequestListAccessError(
      400,
      "Upload a file before submitting this request.",
    );
  }
}
