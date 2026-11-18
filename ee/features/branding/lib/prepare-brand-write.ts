import type { Prisma } from "@prisma/client";
import { z } from "zod";

import { validateRedirectUrl } from "@/lib/api/domains/validate-redirect-url";
import {
  teamPlanAllowsCustomWelcomeAndCta,
  teamPlanAllowsLayoutCustomization,
  teamPlanAllowsVisitorLanguage,
} from "@/lib/billing/team-plan-custom-messaging";
import { getFeatureFlags } from "@/lib/featureFlags";
import { DEFAULT_LOCALE, SUPPORTED_LOCALE_CODES } from "@/lib/i18n/locales";

import {
  DataroomCardLayoutSchema,
  DataroomViewerHeaderStyleSchema,
  DataroomViewerLayoutPresetSchema,
} from "./dataroom-viewer-layout";

const color = z
  .string()
  .regex(
    /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i,
    "Use a hexadecimal color",
  )
  .nullable()
  .optional();
const media = z
  .string()
  .trim()
  .max(8192)
  .refine(
    (v) =>
      !v || v === "no-banner" || /^https?:\/\//i.test(v) || /^\/(?!\/)/.test(v),
    "Upload the asset before saving, or use an HTTP(S) image URL",
  )
  .nullable()
  .optional();
const schema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  logo: media,
  hideLogo: z.boolean().optional(),
  banner: media,
  brandColor: color,
  accentColor: color,
  accentButtonColor: color,
  applyAccentColorToDataroomView: z.boolean().optional(),
  welcomeMessage: z
    .string()
    .trim()
    .max(80)
    .refine((v) => !/<[^>]*>/.test(v), "Use plain text only")
    .nullable()
    .optional(),
  ctaLabel: z.string().trim().max(80).nullable().optional(),
  ctaUrl: z.string().trim().max(2048).nullable().optional(),
  privacyPolicyUrl: z.string().trim().max(2048).nullable().optional(),
  customLinkPreviewEnabled: z.boolean().optional(),
  linkPreviewTitle: z.string().max(200).nullable().optional(),
  linkPreviewDescription: z.string().max(1000).nullable().optional(),
  linkPreviewImage: media,
  linkPreviewFavicon: media,
  cardLayout: DataroomCardLayoutSchema.optional(),
  showFolderTree: z.boolean().optional(),
  viewerLayoutPreset: DataroomViewerLayoutPresetSchema.optional(),
  viewerHeaderStyle: DataroomViewerHeaderStyleSchema.optional(),
  hideFolderIconsInMain: z.boolean().optional(),
  defaultLanguage: z
    .enum([DEFAULT_LOCALE, ...SUPPORTED_LOCALE_CODES])
    .optional(),
});
type PreparedData = Omit<Prisma.BrandUncheckedCreateInput, "teamId">;
type Failure = {
  ok: false;
  status: number;
  message: string;
  errors?: Record<string, string[] | undefined>;
};
export async function prepareBrandWrite(
  {
    body,
    teamId,
    plan,
    nameRequired = false,
  }: { body: unknown; teamId: string; plan: string; nameRequired?: boolean },
  dependencies: {
    validateUrl?: typeof validateRedirectUrl;
    privacyEnabled?: () => Promise<boolean>;
  } = {},
): Promise<{ ok: true; data: PreparedData } | Failure> {
  if (!teamId) return { ok: false, status: 400, message: "Team is required" };
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return {
      ok: false,
      status: 400,
      message: "Invalid brand settings",
      errors: parsed.error.flatten().fieldErrors,
    };
  if (nameRequired && !parsed.data.name)
    return {
      ok: false,
      status: 400,
      message: "Brand name is required",
      errors: { name: ["Brand name is required"] },
    };
  const data = { ...parsed.data };
  if (!teamPlanAllowsCustomWelcomeAndCta(plan))
    for (const key of [
      "welcomeMessage",
      "ctaLabel",
      "ctaUrl",
      "customLinkPreviewEnabled",
      "linkPreviewTitle",
      "linkPreviewDescription",
      "linkPreviewImage",
      "linkPreviewFavicon",
    ] as const)
      delete data[key];
  if (!teamPlanAllowsLayoutCustomization(plan))
    for (const key of [
      "cardLayout",
      "showFolderTree",
      "viewerLayoutPreset",
      "viewerHeaderStyle",
      "hideFolderIconsInMain",
    ] as const)
      delete data[key];
  if (
    data.defaultLanguage !== DEFAULT_LOCALE &&
    !teamPlanAllowsVisitorLanguage(plan)
  )
    delete data.defaultLanguage;
  const validate = dependencies.validateUrl ?? validateRedirectUrl;
  for (const key of ["ctaUrl", "privacyPolicyUrl"] as const) {
    if (data[key] === undefined) continue;
    if (
      key === "privacyPolicyUrl" &&
      !(await (dependencies.privacyEnabled?.() ??
        getFeatureFlags({ teamId }).then((f) => !!f.customPrivacyUrl)))
    ) {
      delete data[key];
      continue;
    }
    if (!data[key]) {
      data[key] = null;
      continue;
    }
    const checked = await validate(data[key]!, teamId);
    if (!checked.valid)
      return { ok: false, status: 400, message: checked.message };
    data[key] = checked.url || null;
  }
  // Name defaults for creation only; an omitted name on update stays omitted.
  return { ok: true, data };
}
