type PreviewBrand = {
  customLinkPreviewEnabled?: boolean;
  linkPreviewTitle?: string | null;
  linkPreviewDescription?: string | null;
  linkPreviewImage?: string | null;
  linkPreviewFavicon?: string | null;
};
type LinkMeta = {
  enableCustomMetatag?: boolean;
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaImage?: string | null;
  metaFavicon?: string | null;
};
export type ResolvedPublicLinkMeta = {
  enableCustomMetatag: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
  metaImage: string | null;
  metaFavicon: string | null;
};
const text = (value?: string | null) => value?.trim() || null;
function image(value?: string | null): string | null {
  const v = text(value);
  if (!v) return null;
  try {
    const url = new URL(v);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return /^\/(?!\/)/.test(v) ? v : null;
  }
}
export function resolvePublicLinkMeta({
  link,
  teamBrand,
  dataroomBrand,
  defaultTitle,
}: {
  link: LinkMeta;
  teamBrand?: PreviewBrand | null;
  dataroomBrand?: PreviewBrand | null;
  defaultTitle: string;
}): ResolvedPublicLinkMeta {
  const brand = dataroomBrand?.customLinkPreviewEnabled
    ? dataroomBrand
    : teamBrand?.customLinkPreviewEnabled
      ? teamBrand
      : null;
  const enabled = Boolean(link.enableCustomMetatag || brand);
  return {
    enableCustomMetatag: enabled,
    metaTitle:
      (link.enableCustomMetatag ? text(link.metaTitle) : null) ??
      text(brand?.linkPreviewTitle) ??
      defaultTitle,
    metaDescription:
      (link.enableCustomMetatag ? text(link.metaDescription) : null) ??
      text(brand?.linkPreviewDescription),
    metaImage:
      (link.enableCustomMetatag ? image(link.metaImage) : null) ??
      image(brand?.linkPreviewImage),
    metaFavicon:
      (link.enableCustomMetatag ? image(link.metaFavicon) : null) ??
      image(brand?.linkPreviewFavicon),
  };
}
