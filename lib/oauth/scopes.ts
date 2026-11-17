/** Shared vocabulary for the token endpoint and its resource-permission editor. */
export const PRESET_SCOPES = Object.freeze(["apis.all", "apis.read"] as const);

export const GRANULAR_SCOPES = Object.freeze([
  "documents.read",
  "documents.write",
  "links.read",
  "links.write",
  "datarooms.read",
  "datarooms.write",
  "analytics.read",
  "visitors.read",
] as const);

export type PresetScope = (typeof PRESET_SCOPES)[number];
export type GranularScope = (typeof GRANULAR_SCOPES)[number];
export type ApiScope = PresetScope | GranularScope;

/** Null is the documented legacy full-access value; unknown grants stay denied. */
export function tokenHasScope(
  scopes: string | null,
  required: GranularScope,
): boolean {
  const values = scopes === null ? ["apis.all"] : scopes.split(/\s+/);
  return (
    values.includes("apis.all") ||
    values.includes(required) ||
    (required.endsWith(".read") && values.includes("apis.read"))
  );
}
