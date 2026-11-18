export type BrandLogoFields = {
  logo?: string | null;
  hideLogo?: boolean | null;
};
export type ResolvedBrandLogo =
  | { kind: "custom"; src: string }
  | { kind: "papermark" }
  | { kind: "none" };

export function resolveBrandLogo(
  brand?: BrandLogoFields | null,
): ResolvedBrandLogo {
  if (brand?.hideLogo === true) return { kind: "none" };
  const src = brand?.logo?.trim();
  if (
    src &&
    (/^https?:\/\//i.test(src) ||
      /^\/(?!\/)/.test(src) ||
      /^blob:/i.test(src) ||
      /^data:image\//i.test(src))
  )
    return { kind: "custom", src };
  return { kind: "papermark" };
}
