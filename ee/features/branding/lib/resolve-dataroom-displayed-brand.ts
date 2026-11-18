import type { Brand, DataroomBrand } from "@prisma/client";

export const CUSTOM_DATAROOM_BRAND = "custom";
export const CUSTOM_DATAROOM_BRAND_LABEL = "Custom data room brand";
export function inheritsTeamBrand(input: {
  linkBrandId?: string | null;
  dataroomBrandId?: string | null;
  hasDataroomBrand: boolean;
}): boolean {
  return Boolean(
    input.linkBrandId || input.dataroomBrandId || !input.hasDataroomBrand,
  );
}
export function resolveDisplayedDataroomBrand({
  dataroomBrand,
  teamBrand,
  inheritTeamBrand,
}: {
  dataroomBrand?: Partial<DataroomBrand> | null;
  teamBrand?: Partial<Brand> | null;
  inheritTeamBrand: boolean;
}): Partial<Brand> | Partial<DataroomBrand> | null {
  if (inheritTeamBrand) return teamBrand ? { ...teamBrand } : null;
  if (!dataroomBrand) return teamBrand ? { ...teamBrand } : null;
  // A room-owned brand remains independent; nullable hideLogo alone inherits.
  return {
    ...dataroomBrand,
    hideLogo: dataroomBrand.hideLogo ?? teamBrand?.hideLogo ?? false,
  };
}
