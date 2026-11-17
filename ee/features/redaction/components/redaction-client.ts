export type RedactionJobSummary = {
  id: string;
  status: string;
  createdAt: string;
  documentVersionId: string;
};

export type RedactionRegion = {
  id: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  status: string;
};

export type RedactionJobResponse = {
  job: {
    id: string;
    status: string;
    error: string | null;
    resultVersionId: string | null;
    createdAt: string;
  };
  regions: RedactionRegion[];
  numPages: number;
};

export const redactionStatusLabels: Record<string, string> = {
  PENDING: "Preparing",
  DETECTING: "Preparing",
  REVIEW: "Draft",
  APPLYING: "Applying",
  APPLIED: "Applied",
  FAILED: "Failed",
};

export function redactionCollectionUrl(teamId: string, documentId: string) {
  return `/api/teams/${encodeURIComponent(teamId)}/documents/${encodeURIComponent(documentId)}/redactions`;
}

export async function redactionRequest<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...options });
  const responseText = await response.text();
  let body: Record<string, unknown> | null = null;
  try {
    body = JSON.parse(responseText);
  } catch {
    /* Intentional API failures may be plain text. */
  }
  if (!response.ok) {
    const fallback =
      "Unable to complete this redaction request. Refresh and try again.";
    const supplied =
      typeof body?.error === "string"
        ? body.error
        : typeof body?.message === "string"
          ? body.message
          : responseText.trim();
    throw new Error(
      response.status < 500 &&
        supplied &&
        supplied.length <= 400 &&
        !supplied.startsWith("<")
        ? supplied
        : fallback,
    );
  }
  if (!body || typeof body !== "object")
    throw new Error(
      "Unable to read the redaction response. Refresh and try again.",
    );
  return body as T;
}

/** Rectangles are relative to the complete source page, with a top-left origin. */
export function validateRegion(
  region: Pick<RedactionRegion, "x" | "y" | "width" | "height">,
) {
  return (
    [region.x, region.y, region.width, region.height].every(Number.isFinite) &&
    region.x >= 0 &&
    region.y >= 0 &&
    region.width > 0 &&
    region.height > 0 &&
    region.x + region.width <= 1000 &&
    region.y + region.height <= 1000
  );
}

export function rectangleFromPoints(
  start: { x: number; y: number },
  end: { x: number; y: number },
) {
  const clamp = (value: number) => Math.max(0, Math.min(1000, value));
  const x1 = clamp(start.x);
  const y1 = clamp(start.y);
  const x2 = clamp(end.x);
  const y2 = clamp(end.y);
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
  };
}
