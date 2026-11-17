export type DataroomBannerKind = "none" | "image" | "video" | "youtube";
export type ClassifiedDataroomBanner = {
  kind: DataroomBannerKind;
  src: string | null;
  youtubeId?: string;
};

export function classifyDataroomBanner(
  value?: string | null,
): ClassifiedDataroomBanner {
  const src = value?.trim();
  if (!src || src === "no-banner") return { kind: "none", src: null };
  if (/^data:image\//i.test(src)) return { kind: "image", src };
  if (/^data:video\//i.test(src)) return { kind: "video", src };
  if (/^blob:/i.test(src)) return { kind: "image", src };
  try {
    const url = new URL(src, "https://preview.invalid");
    if (!["http:", "https:"].includes(url.protocol) || src.startsWith("//"))
      return { kind: "none", src: null };
    const host = url.hostname.toLowerCase();
    let youtubeId: string | null = null;
    if (
      [
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
        "youtube-nocookie.com",
        "www.youtube-nocookie.com",
      ].includes(host)
    ) {
      youtubeId =
        url.searchParams.get("v") ||
        (/^\/(?:embed|shorts|live)\/([^/]+)/.exec(url.pathname)?.[1] ?? null);
    } else if (host === "youtu.be" || host === "www.youtu.be")
      youtubeId = url.pathname.split("/")[1];
    if (youtubeId && /^[a-zA-Z0-9_-]{11}$/.test(youtubeId))
      return { kind: "youtube", src, youtubeId };
    if (/\.(mp4|webm|mov|m4v|ogv)$/i.test(url.pathname))
      return { kind: "video", src };
    if (/^https?:\/\//i.test(src) || /^\/(?!\/)/.test(src))
      return { kind: "image", src };
  } catch {
    /* Invalid media is not embedded. */
  }
  return { kind: "none", src: null };
}
