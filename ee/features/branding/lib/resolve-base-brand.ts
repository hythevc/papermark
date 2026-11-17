import type { Brand, Prisma, PrismaClient } from "@prisma/client";

import { TeamError } from "@/lib/errorHandler";
import prisma from "@/lib/prisma";

export type BrandDatabase = Pick<PrismaClient, "team" | "brand">;
export const teamBrandViewerSelect = {
  id: true,
  logo: true,
  hideLogo: true,
  banner: true,
  brandColor: true,
  accentColor: true,
  accentButtonColor: true,
  applyAccentColorToDataroomView: true,
  welcomeMessage: true,
  ctaLabel: true,
  ctaUrl: true,
  privacyPolicyUrl: true,
  cardLayout: true,
  showFolderTree: true,
  viewerLayoutPreset: true,
  viewerHeaderStyle: true,
  hideFolderIconsInMain: true,
  defaultLanguage: true,
  customLinkPreviewEnabled: true,
  linkPreviewTitle: true,
  linkPreviewDescription: true,
  linkPreviewImage: true,
  linkPreviewFavicon: true,
} satisfies Prisma.BrandSelect;
export const teamBrandWorkflowSelect = {
  logo: true,
  hideLogo: true,
  brandColor: true,
  accentColor: true,
  accentButtonColor: true,
  welcomeMessage: true,
  ctaLabel: true,
  ctaUrl: true,
  privacyPolicyUrl: true,
} satisfies Prisma.BrandSelect;
export const teamBrandOgSelect = {
  customLinkPreviewEnabled: true,
  linkPreviewTitle: true,
  linkPreviewDescription: true,
  linkPreviewImage: true,
  linkPreviewFavicon: true,
} satisfies Prisma.BrandSelect;

export class BrandOwnershipError extends TeamError {
  statusCode = 404;
}

export async function findDefaultBrand(
  teamId: string,
  db: BrandDatabase = prisma,
): Promise<Brand | null> {
  if (!teamId) throw new BrandOwnershipError("Team not found");
  const team = await db.team.findUnique({
    where: { id: teamId },
    select: { defaultBrandId: true },
  });
  if (!team) return null;
  if (team.defaultBrandId) {
    const selected = await db.brand.findFirst({
      where: { id: team.defaultBrandId, teamId },
    });
    if (selected) return selected;
  }
  return db.brand.findFirst({
    where: { teamId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
}
export async function resolveDefaultBrandId(
  teamId: string,
  db: BrandDatabase = prisma,
): Promise<string | null> {
  return (await findDefaultBrand(teamId, db))?.id ?? null;
}
export async function resolveOwnedBrandId(
  teamId: string,
  value: unknown,
  db: BrandDatabase = prisma,
): Promise<string | null> {
  if (!teamId) throw new BrandOwnershipError("Team not found");
  if (value == null || value === "") return null;
  if (typeof value !== "string") throw new TeamError("Invalid brand ID");
  const brand = await db.brand.findFirst({
    where: { id: value, teamId },
    select: { id: true },
  });
  if (!brand) throw new BrandOwnershipError("Brand not found");
  return brand.id;
}
export async function resolveBaseBrand<T extends Prisma.BrandSelect>(
  {
    teamId,
    linkBrandId,
    dataroomBrandId,
    select,
  }: {
    teamId: string;
    linkBrandId?: string | null;
    dataroomBrandId?: string | null;
    select: T;
  },
  db: BrandDatabase = prisma,
): Promise<Prisma.BrandGetPayload<{ select: T }> | null> {
  if (!teamId) return null;
  for (const id of [linkBrandId, dataroomBrandId]) {
    if (!id) continue;
    const brand = await db.brand.findFirst({ where: { id, teamId }, select });
    if (brand) return brand as Prisma.BrandGetPayload<{ select: T }>;
  }
  const fallback = await findDefaultBrand(teamId, db);
  if (!fallback) return null;
  return db.brand.findFirst({
    where: { id: fallback.id, teamId },
    select,
  }) as Promise<Prisma.BrandGetPayload<{ select: T }> | null>;
}

const scalarFields = [
  "name",
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
  "privacyPolicyUrl",
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
type BrandScalarData = Partial<
  Omit<Brand, "id" | "teamId" | "createdAt" | "updatedAt">
>;
export function brandScalarWrite(
  data: Prisma.BrandUncheckedCreateInput | Prisma.BrandUncheckedUpdateInput,
): BrandScalarData {
  const out: BrandScalarData = {};
  const booleans = new Set<string>([
    "hideLogo",
    "applyAccentColorToDataroomView",
    "showFolderTree",
    "hideFolderIconsInMain",
    "customLinkPreviewEnabled",
  ]);
  for (const key of scalarFields) {
    const value = data[key];
    if (value === undefined) continue;
    if (
      booleans.has(key)
        ? typeof value !== "boolean"
        : typeof value !== "string" && value !== null
    )
      throw new TeamError(`Invalid brand field: ${key}`);
    if (
      (key === "name" || key === "defaultLanguage") &&
      typeof value !== "string"
    )
      throw new TeamError(`Invalid brand field: ${key}`);
    Object.assign(out, { [key]: value });
  }
  return out;
}

export async function persistDefaultBrand(
  {
    teamId,
    create,
    update,
  }: {
    teamId: string;
    create: Prisma.BrandUncheckedCreateInput;
    update: Prisma.BrandUncheckedUpdateInput;
  },
  db: Pick<PrismaClient, "$transaction"> = prisma,
): Promise<Brand> {
  if (!teamId) throw new BrandOwnershipError("Team not found");
  return db.$transaction(async (tx) => {
    const team = await tx.team.findUnique({
      where: { id: teamId },
      select: { id: true },
    });
    if (!team) throw new BrandOwnershipError("Team not found");
    const existing = await findDefaultBrand(teamId, tx);
    const brand = existing
      ? await tx.brand.update({
          where: { id: existing.id, teamId },
          data: brandScalarWrite(update),
        })
      : await tx.brand.create({
          data: {
            ...brandScalarWrite(create),
            name: typeof create.name === "string" ? create.name : "Default",
            teamId,
          },
        });
    await tx.team.update({
      where: { id: teamId },
      data: { defaultBrandId: brand.id },
    });
    return brand;
  });
}
