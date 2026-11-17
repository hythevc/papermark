export const AUTO_FILL_NOT_FOUND_MESSAGE =
  "No brand assets were found. You can add your logo and colors manually.";
export function autoFillHasBrandAssets(
  value: unknown,
  options: { allowBanner?: boolean } = {},
): boolean {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  return [
    "logo",
    "brandColor",
    "accentColor",
    "accentButtonColor",
    ...(options.allowBanner ? ["banner"] : []),
  ].some(
    (key) =>
      typeof data[key] === "string" && Boolean((data[key] as string).trim()),
  );
}
