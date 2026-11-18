import type { Brand, PrismaClient } from "@prisma/client";
import assert from "node:assert/strict";
import { test } from "node:test";

import { deleteTeamBrand } from "./delete-team-brand";
import { prepareBrandWrite } from "./prepare-brand-write";
import {
  type BrandDatabase,
  brandScalarWrite,
  findDefaultBrand,
  persistDefaultBrand,
  resolveBaseBrand,
  resolveOwnedBrandId,
} from "./resolve-base-brand";
import { upsertDataroomBrandAndClearInherited } from "./upsert-dataroom-brand";

test("brand resolution never reads an explicit or default brand outside its team", async () => {
  const queries: unknown[] = [];
  const db = {
    team: { findUnique: async () => ({ defaultBrandId: "foreign" }) },
    brand: {
      findFirst: async (q: { where: { id?: string; teamId: string } }) => {
        queries.push(q);
        assert.equal(q.where.teamId, "team-a");
        return q.where.id ? null : { id: "owned", teamId: "team-a" };
      },
    },
  } as unknown as BrandDatabase;
  assert.equal((await findDefaultBrand("team-a", db))?.id, "owned");
  await assert.rejects(
    resolveOwnedBrandId("team-a", "foreign", db),
    /Brand not found/,
  );
  await assert.rejects(
    resolveOwnedBrandId("", "foreign", db),
    /Team not found/,
  );
  const selected = await resolveBaseBrand(
    { teamId: "team-a", linkBrandId: "foreign", select: { id: true } },
    db,
  );
  assert.equal(selected, null);
  assert.ok(queries.length > 0);
});
test("explicit owned link brand wins over room and team defaults", async () => {
  const db = {
    team: {
      findUnique: async () => {
        throw new Error("Unexpected default lookup");
      },
    },
    brand: {
      findFirst: async (q: { where: { id: string; teamId: string } }) => {
        assert.deepEqual(q.where, { id: "link-brand", teamId: "team-a" });
        return { id: "link-brand", logo: "owned-logo" };
      },
    },
  } as unknown as BrandDatabase;
  assert.equal(
    (
      await resolveBaseBrand(
        {
          teamId: "team-a",
          linkBrandId: "link-brand",
          dataroomBrandId: "room-brand",
          select: { logo: true },
        },
        db,
      )
    )?.logo,
    "owned-logo",
  );
});
test("brand scalar write cannot redirect identity/ownership or introduce relation mutations", () => {
  assert.deepEqual(
    brandScalarWrite({
      teamId: "foreign",
      id: "overwrite",
      name: "Owned",
      logo: "https://assets.example/a.png",
      links: { connect: { id: "foreign-link" } },
    }),
    { name: "Owned", logo: "https://assets.example/a.png" },
  );
  assert.throws(
    () => brandScalarWrite({ teamId: "team-a", name: { set: "bad" } }),
    /Invalid brand field/,
  );
});
test("default persistence uses one transaction and forces trusted team identity", async () => {
  const calls: string[] = [];
  const tx = {
    team: {
      findUnique: async () => ({ id: "team-a", defaultBrandId: null }),
      update: async (q: unknown) => {
        calls.push("default");
        return q;
      },
    },
    brand: {
      findFirst: async () => null,
      create: async (q: { data: Record<string, unknown> }) => {
        assert.equal(q.data.teamId, "team-a");
        assert.ok(!("id" in q.data));
        calls.push("create");
        return { id: "created", teamId: "team-a" };
      },
    },
  };
  const db = {
    $transaction: async (fn: (value: unknown) => Promise<unknown>) => {
      calls.push("begin");
      const result = await fn(tx);
      calls.push("commit");
      return result;
    },
  } as unknown as Pick<PrismaClient, "$transaction">;
  const result = await persistDefaultBrand(
    {
      teamId: "team-a",
      create: { name: "Own", teamId: "foreign", id: "bad" },
      update: {},
    },
    db,
  );
  assert.equal(result.id, "created");
  assert.deepEqual(calls, ["begin", "create", "default", "commit"]);
});
test("room brand writes reject foreign and frozen rooms before mutation", async () => {
  for (const room of [null, { id: "room", isFrozen: true }]) {
    let mutated = false;
    const tx = {
      dataroom: {
        findFirst: async (q: { where: unknown }) => {
          assert.deepEqual(q.where, { id: "room", teamId: "team-a" });
          return room;
        },
        update: async () => {
          mutated = true;
        },
      },
      dataroomBrand: {
        upsert: async () => {
          mutated = true;
        },
      },
    };
    const db = {
      $transaction: async (fn: (value: unknown) => Promise<unknown>) => fn(tx),
    } as unknown as Pick<PrismaClient, "$transaction">;
    await assert.rejects(
      upsertDataroomBrandAndClearInherited(
        { teamId: "team-a", dataroomId: "room", data: { logo: null } },
        db,
      ),
    );
    assert.equal(mutated, false);
  }
});
test("custom room save and inherited-brand clearing are atomic and strip unknown fields", async () => {
  const calls: string[] = [];
  const tx = {
    dataroom: {
      findFirst: async () => ({ id: "room", isFrozen: false }),
      update: async (q: { where: unknown; data: unknown }) => {
        assert.deepEqual(q.where, { id: "room", teamId: "team-a" });
        assert.deepEqual(q.data, { brandId: null });
        calls.push("clear");
      },
    },
    dataroomBrand: {
      upsert: async (q: { create: Record<string, unknown> }) => {
        assert.deepEqual(q.create, {
          logo: null,
          hideLogo: false,
          dataroomId: "room",
        });
        calls.push("upsert");
        return { id: "brand" };
      },
    },
  };
  const db = {
    $transaction: async (fn: (value: unknown) => Promise<unknown>) => {
      calls.push("begin");
      const value = await fn(tx);
      calls.push("commit");
      return value;
    },
  } as unknown as Pick<PrismaClient, "$transaction">;
  await upsertDataroomBrandAndClearInherited(
    {
      teamId: "team-a",
      dataroomId: "room",
      data: { logo: null, hideLogo: false, id: "foreign" } as never,
    },
    db,
  );
  assert.deepEqual(calls, ["begin", "upsert", "clear", "commit"]);
});
test("delete refuses cross-team references before deleting or updating cache", async () => {
  let mutated = false;
  const tx = {
    brand: {
      findFirst: async () => ({ id: "brand", teamId: "team-a" }),
      delete: async () => {
        mutated = true;
      },
    },
    link: { count: async () => 1 },
    dataroom: { count: async () => 0 },
    team: { count: async () => 0 },
  };
  const db = {
    $transaction: async (fn: (value: unknown) => Promise<unknown>) => fn(tx),
  } as unknown as Pick<PrismaClient, "$transaction">;
  await assert.rejects(
    deleteTeamBrand(
      { teamId: "team-a", brand: { id: "brand", teamId: "team-a" } },
      db,
      async () => {
        mutated = true;
      },
    ),
    /ownership/,
  );
  assert.equal(mutated, false);
});
for (const storedDefaultId of ["brand", null]) {
  test(`delete reassigns a deleted ${storedDefaultId ? "explicit" : "legacy implicit"} default and syncs cache only after commit`, async () => {
    const calls: string[] = [];
    let reads = 0;
    const replacement = { id: "replacement", teamId: "team-a" } as Brand;
    const tx = {
      brand: {
        findFirst: async () =>
          ++reads <= 2 ? { id: "brand", teamId: "team-a" } : replacement,
        delete: async () => calls.push("delete"),
      },
      link: {
        count: async () => 0,
        updateMany: async (q: { where: { teamId: string } }) => {
          assert.equal(q.where.teamId, "team-a");
          calls.push("links");
        },
      },
      dataroom: {
        count: async () => 0,
        updateMany: async () => calls.push("rooms"),
      },
      team: {
        count: async () => 0,
        findUnique: async () => ({ defaultBrandId: storedDefaultId }),
        update: async (q: { data: unknown }) => {
          assert.deepEqual(q.data, { defaultBrandId: "replacement" });
          calls.push("default");
        },
      },
    };
    const db = {
      $transaction: async (fn: (value: unknown) => Promise<unknown>) => {
        calls.push("begin");
        const result = await fn(tx);
        calls.push("commit");
        return result;
      },
    } as unknown as Pick<PrismaClient, "$transaction">;
    await deleteTeamBrand(
      { teamId: "team-a", brand: { id: "brand", teamId: "team-a" } },
      db,
      async (team, next) => {
        assert.equal(team, "team-a");
        assert.equal(next?.id, "replacement");
        calls.push("cache");
      },
    );
    assert.deepEqual(calls, [
      "begin",
      "links",
      "rooms",
      "default",
      "delete",
      "commit",
      "cache",
    ]);
  });
}
test("brand writes reject unsaved uploads, malformed colors, missing names and executable redirects", async () => {
  assert.equal(
    (
      await prepareBrandWrite({
        teamId: "team-a",
        plan: "datarooms-plus",
        body: { name: "Brand", logo: "data:image/png;base64,abc" },
        nameRequired: true,
      })
    ).ok,
    false,
  );
  assert.equal(
    (
      await prepareBrandWrite({
        teamId: "team-a",
        plan: "datarooms-plus",
        body: { name: "Brand", brandColor: "#12345" },
      })
    ).ok,
    false,
  );
  assert.equal(
    (
      await prepareBrandWrite({
        teamId: "team-a",
        plan: "free",
        body: {},
        nameRequired: true,
      })
    ).ok,
    false,
  );
  const failed = await prepareBrandWrite(
    {
      teamId: "team-a",
      plan: "business",
      body: { ctaUrl: "javascript:alert(1)" },
    },
    { validateUrl: async () => ({ valid: false, message: "Use HTTPS" }) },
  );
  assert.equal(failed.ok, false);
});
test("free plans cannot mutate paid messaging/layout/language; omitted name remains omitted", async () => {
  const result = await prepareBrandWrite({
    teamId: "team-a",
    plan: "free",
    body: {
      brandColor: "#123456",
      ctaLabel: "Upgrade",
      ctaUrl: "https://example.com",
      cardLayout: "GRID",
      defaultLanguage: "de",
    },
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(result.data, { brandColor: "#123456" });
    assert.ok(!("name" in result.data));
  }
});
test("privacy URLs require the feature flag and validation before persistence", async () => {
  const input = {
    teamId: "team-a",
    plan: "business",
    body: { privacyPolicyUrl: "https://example.com/privacy" },
  };
  const off = await prepareBrandWrite(input, {
    privacyEnabled: async () => false,
    validateUrl: async () => {
      throw new Error("Must not validate a gated field");
    },
  });
  assert.ok(off.ok && !("privacyPolicyUrl" in off.data));
  const on = await prepareBrandWrite(input, {
    privacyEnabled: async () => true,
    validateUrl: async (url, team) => {
      assert.equal(team, "team-a");
      return { valid: true, url };
    },
  });
  assert.ok(
    on.ok && on.data.privacyPolicyUrl === "https://example.com/privacy",
  );
});
