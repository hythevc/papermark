import type { SlackIntegration } from "./types";

export type SlackIntegrationUnavailable = {
  configured: false;
  integration: null;
  message: string;
};

export type SlackIntegrationResponse =
  | SlackIntegration
  | SlackIntegrationUnavailable
  | { configured: true; integration: null };

/** Keep unavailable, not installed, and failed requests distinct. */
export function decodeSlackIntegration(
  data: SlackIntegrationResponse | undefined,
  errorStatus?: number,
): { configured: boolean | null; integration: SlackIntegration | null } {
  if (!data)
    return { configured: errorStatus === 404 ? true : null, integration: null };
  if ("configured" in data)
    return { configured: data.configured, integration: null };
  return { configured: true, integration: data };
}
