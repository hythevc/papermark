import { isLocalIntegration } from "@/lib/local-integration";

/** Select real inline rendering independently of development-only service capture. */
export function usesInlineDocumentProcessing(
  env: Readonly<Record<string, string | undefined>> = process.env,
): boolean {
  switch (env.ROOMLINE_PROCESSING_MODE) {
    case "inline":
      return true;
    case "trigger":
      return false;
    case undefined:
      return isLocalIntegration(env);
    default:
      throw new Error("ROOMLINE_PROCESSING_MODE must be inline or trigger.");
  }
}
