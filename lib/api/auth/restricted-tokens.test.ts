import assert from "node:assert/strict";
import test from "node:test";

import {
  type RestrictedTokenRevocationClient,
  RestrictedTokenSubjectTypeSchema,
  parseRestrictedTokenSubjectType,
  revokeUserBoundTeamTokens,
} from "./restricted-tokens";

test("only an explicit machine subject is independent of the user's membership", () => {
  assert.equal(RestrictedTokenSubjectTypeSchema.parse("user"), "user");
  assert.equal(RestrictedTokenSubjectTypeSchema.parse("machine"), "machine");
  assert.equal(parseRestrictedTokenSubjectType("machine"), "machine");
  for (const value of [
    undefined,
    null,
    "",
    "Machine",
    " machine ",
    "service",
    {},
    1,
    "user",
  ]) {
    assert.equal(parseRestrictedTokenSubjectType(value), "user");
    if (value !== "user")
      assert.equal(
        RestrictedTokenSubjectTypeSchema.safeParse(value).success,
        false,
      );
  }
});

test("revocation is bound to both user and team and preserves only explicitly machine-bound keys", async () => {
  let calls = 0;
  const client: RestrictedTokenRevocationClient = {
    restrictedToken: {
      async deleteMany(args) {
        calls++;
        assert.deepEqual(args.where, {
          userId: "removed-user",
          teamId: "selected-team",
          subjectType: { not: "machine" },
        });
        assert.equal(
          Object.hasOwn(args.where ?? {}, "source"),
          false,
          "dashboard and OAuth user keys must both be revoked",
        );
        return { count: 3 };
      },
    },
  };
  assert.deepEqual(
    await revokeUserBoundTeamTokens("removed-user", "selected-team", client),
    { count: 3 },
  );
  assert.equal(calls, 1);
});

test("missing identifiers cannot turn revocation into a broader Prisma delete", async () => {
  let calls = 0;
  const client: RestrictedTokenRevocationClient = {
    restrictedToken: {
      async deleteMany() {
        calls++;
        return { count: 0 };
      },
    },
  };
  for (const [userId, teamId] of [
    [undefined, "team"],
    [null, "team"],
    ["", "team"],
    [" ", "team"],
    ["user", undefined],
    ["user", ""],
    ["user", " "],
  ]) {
    await assert.rejects(
      Reflect.apply(revokeUserBoundTeamTokens, undefined, [
        userId,
        teamId,
        client,
      ]),
      /user ID and team ID/,
    );
  }
  assert.equal(calls, 0);
});

test("revocation failures reach the caller instead of falsely reporting success", async () => {
  const failure = new Error("database unavailable");
  const client: RestrictedTokenRevocationClient = {
    restrictedToken: {
      async deleteMany() {
        throw failure;
      },
    },
  };
  await assert.rejects(
    revokeUserBoundTeamTokens("user", "team", client),
    (error) => error === failure,
  );
});
