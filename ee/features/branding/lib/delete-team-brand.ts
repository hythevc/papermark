import type { Brand, PrismaClient } from "@prisma/client";

import prisma from "@/lib/prisma";

import { BrandOwnershipError, findDefaultBrand } from "./resolve-base-brand";

type CacheUpdate = (teamId: string, brand: Brand | null) => Promise<void>;
export async function deleteTeamBrand(
  { teamId, brand }: { teamId: string; brand: Pick<Brand, "id" | "teamId"> },
  db: Pick<PrismaClient, "$transaction"> = prisma,
  syncCache: CacheUpdate = async (id, next) => {
    const cache = await import("@/lib/redis/brand-logo-cache");
    if (next) await cache.writeCachedBrandLogo(id, next);
    else await cache.clearCachedBrandLogo(id);
  },
): Promise<void> {
  if (!teamId || brand.teamId !== teamId)
    throw new BrandOwnershipError("Brand not found");
  const nextDefault = await db.$transaction(async (tx) => {
    const owned = await tx.brand.findFirst({ where: { id: brand.id, teamId } });
    if (!owned) throw new BrandOwnershipError("Brand not found");
    const foreignReferences = await Promise.all([
      tx.link.count({
        where: {
          brandId: owned.id,
          OR: [{ teamId: { not: teamId } }, { teamId: null }],
        },
      }),
      tx.dataroom.count({
        where: { brandId: owned.id, teamId: { not: teamId } },
      }),
      tx.team.count({
        where: { defaultBrandId: owned.id, id: { not: teamId } },
      }),
    ]);
    if (foreignReferences.some(Boolean))
      throw new BrandOwnershipError("Brand has invalid ownership references");
    // Legacy teams may not have a default pointer yet. Match viewer fallback
    // resolution so deleting their effective default cannot leave a stale logo.
    const effectiveDefault = await findDefaultBrand(teamId, tx);
    if (!effectiveDefault) throw new BrandOwnershipError("Team not found");
    const replacement = await tx.brand.findFirst({
      where: { teamId, id: { not: owned.id } },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
    // Explicitly clear assignments, matching the schema's SetNull semantics.
    await tx.link.updateMany({
      where: { teamId, brandId: owned.id },
      data: { brandId: null },
    });
    await tx.dataroom.updateMany({
      where: { teamId, brandId: owned.id },
      data: { brandId: null },
    });
    const defaultChanged = effectiveDefault.id === owned.id;
    if (defaultChanged)
      await tx.team.update({
        where: { id: teamId },
        data: { defaultBrandId: replacement?.id ?? null },
      });
    await tx.brand.delete({ where: { id: owned.id, teamId } });
    return { changed: defaultChanged, brand: replacement };
  });
  if (nextDefault.changed) await syncCache(teamId, nextDefault.brand);
  // Uploaded assets can be shared by brands/rooms; do not delete blobs blindly.
}
