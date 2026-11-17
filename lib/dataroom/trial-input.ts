import { z } from "zod";

/** Both existing onboarding forms: use-case flow and the industry modal. */
export const trialInputSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    fullName: z.string().trim().min(1).max(160),
    companyName: z.string().trim().min(1).max(160),
    useCase: z.string().trim().max(300).optional(),
    industry: z.string().trim().max(120).optional(),
    companySize: z.string().trim().max(120).default(""),
    tools: z.string().trim().max(500).default(""),
  })
  .transform((input) => ({
    ...input,
    useCase: input.useCase || input.industry || "other",
  }));
