import type { DataroomBrand, Prisma, PrismaClient } from "@prisma/client";

import { TeamError } from "@/lib/errorHandler";
import prisma from "@/lib/prisma";

import { BrandOwnershipError } from "./resolve-base-brand";

type RoomBrandData = Omit<
  Prisma.DataroomBrandUncheckedCreateInput,
  "id" | "dataroomId" | "createdAt" | "updatedAt"
>;
export async function upsertDataroomBrandAndClearInherited(
  {
    teamId,
    dataroomId,
    data,
  }: { teamId: string; dataroomId: string; data: RoomBrandData },
  db: Pick<PrismaClient, "$transaction"> = prisma,
): Promise<DataroomBrand> {
  if (!teamId || !dataroomId)
    throw new BrandOwnershipError("Data room not found");
  return db.$transaction(async (tx) => {
    const room = await tx.dataroom.findFirst({
      where: { id: dataroomId, teamId },
      select: { id: true, isFrozen: true },
    });
    if (!room) throw new BrandOwnershipError("Data room not found");
    if (room.isFrozen) throw new TeamError("This data room is frozen");
    // Ignore relation/identity fields even when an untyped caller passes them.
    const fields: RoomBrandData = {};
    const allowed = [
      "logo",
      "hideLogo",
      "banner",
      "brandColor",
      "accentColor",
      "accentButtonColor",
      "applyAccentColorToDataroomView",
      "welcomeMessage",
      "ctaLabel",
      "ctaUrl",
      "cardLayout",
      "showFolderTree",
      "viewerLayoutPreset",
      "viewerHeaderStyle",
      "hideFolderIconsInMain",
      "customLinkPreviewEnabled",
      "linkPreviewTitle",
      "linkPreviewDescription",
      "linkPreviewImage",
      "linkPreviewFavicon",
      "defaultLanguage",
    ] as const;
    for (const key of allowed) {
      if (data[key] !== undefined) Object.assign(fields, { [key]: data[key] });
    }
    const brand = await tx.dataroomBrand.upsert({
      where: { dataroomId },
      create: { ...fields, dataroomId },
      update: fields,
    });
    await tx.dataroom.update({
      where: { id: dataroomId, teamId },
      data: { brandId: null },
    });
    return brand;
  });
}
