const IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/x-icon",
  "image/vnd.microsoft.icon",
]);

export function validateBrandImageFile(
  file: Pick<File, "type" | "size">,
  maxBytes = 2 * 1024 * 1024,
): string | null {
  if (!IMAGE_TYPES.has(file.type))
    return "Choose a PNG, JPG, WebP, GIF, AVIF, or ICO image.";
  if (file.size <= 0) return "The selected image is empty.";
  if (file.size > maxBytes)
    return `Choose an image smaller than ${maxBytes / 1024 / 1024} MB.`;
  return null;
}

export function isBrandImageSource(
  value: string | null | undefined,
): value is string {
  if (!value) return false;
  if (value.includes("\\")) return false;
  if (/^\/(?!\/)/.test(value)) return true;
  if (
    /^data:image\/(?:png|jpeg|webp|gif|avif|x-icon|vnd\.microsoft\.icon);base64,[a-z0-9+/=\s]+$/i.test(
      value,
    )
  )
    return true;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol)
      ? !url.username && !url.password
      : url.protocol === "blob:" && /^blob:https?:\/\//i.test(value);
  } catch {
    return false;
  }
}

export function parseBrandMediaUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    return ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export function getBrandingPreviewPath(value: string): string | null {
  return [
    "/nav_ppreview_demo",
    "/room_ppreview_demo",
    "/entrance_ppreview_demo",
  ].includes(value)
    ? value
    : null;
}
