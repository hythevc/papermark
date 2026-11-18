import type { Prisma } from "@prisma/client";
import { z } from "zod";

import prisma from "@/lib/prisma";

export const RestrictedTokenSubjectTypeSchema = z.enum(["user", "machine"]);
export type RestrictedTokenSubjectType = z.infer<
  typeof RestrictedTokenSubjectTypeSchema
>;

/** Unknown and legacy values remain bound to the user's workspace membership. */
export function parseRestrictedTokenSubjectType(
  value: unknown,
): RestrictedTokenSubjectType {
  const parsed = RestrictedTokenSubjectTypeSchema.safeParse(value);
  return parsed.success ? parsed.data : "user";
}

export interface RestrictedTokenRevocationClient {
  restrictedToken: {
    deleteMany(
      args: Prisma.RestrictedTokenDeleteManyArgs,
    ): Promise<Prisma.BatchPayload>;
  };
}

/** Revoke dashboard and OAuth user keys for one membership; machine keys survive. */
export async function revokeUserBoundTeamTokens(
  userId: string,
  teamId: string,
  client: RestrictedTokenRevocationClient = prisma,
): Promise<Prisma.BatchPayload> {
  // Prisma omits undefined filters. Reject incomplete identifiers before they
  // can accidentally broaden a revocation to another user or workspace.
  if (
    typeof userId !== "string" ||
    !userId.trim() ||
    typeof teamId !== "string" ||
    !teamId.trim()
  ) {
    throw new TypeError("A user ID and team ID are required to revoke tokens.");
  }
  return client.restrictedToken.deleteMany({
    where: {
      userId,
      teamId,
      // Only an explicit machine subject is independent of membership. This
      // also revokes malformed historical subjects that parse as user keys.
      subjectType: { not: "machine" },
    },
  });
}
