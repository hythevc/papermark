import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

import prisma from "@/lib/prisma";

import { deleteTeamBrand } from "./delete-team-brand";
import {
  findDefaultBrand,
  persistDefaultBrand,
  resolveBaseBrand,
  resolveOwnedBrandId,
} from "./resolve-base-brand";
import { upsertDataroomBrandAndClearInherited } from "./upsert-dataroom-brand";

// Explicit opt-in prevents a normal unit-test discovery run from writing to a
// configured database. The integration harness must use isolated local services.
test(
  "branding persistence against isolated PostgreSQL",
  { skip: process.env.ROOMLINE_BRANDING_INTEGRATION !== "1" },
  async (t) => {
    assert.equal(process.env.ROOMLINE_LOCAL_INTEGRATION, "1");
    assert.equal(process.env.NODE_ENV, "development");
    const databaseHost = new URL(process.env.POSTGRES_PRISMA_URL!).hostname;
    assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(databaseHost));
    const suffix = randomUUID();
    const createdTeamIds: string[] = [];
    try {
      const owner = await prisma.team.create({
        data: { name: `branding-owner-${suffix}` },
      });
      createdTeamIds.push(owner.id);
      const outsider = await prisma.team.create({
        data: { name: `branding-outsider-${suffix}` },
      });
      createdTeamIds.push(outsider.id);
      const first = await persistDefaultBrand({
        teamId: owner.id,
        create: {
          teamId: outsider.id,
          name: "Primary",
          logo: "https://example.com/primary.png",
        },
        update: {},
      });
      const replacement = await prisma.brand.create({
        data: { teamId: owner.id, name: "Replacement", hideLogo: true },
      });
      const foreign = await prisma.brand.create({
        data: { teamId: outsider.id, name: "Foreign" },
      });

      await t.test(
        "default persistence uses trusted ownership and preserves omitted fields",
        async () => {
          assert.equal(first.teamId, owner.id);
          assert.equal((await findDefaultBrand(owner.id))?.id, first.id);
          const saved = await persistDefaultBrand({
            teamId: owner.id,
            create: { teamId: owner.id, name: "Unused" },
            update: { brandColor: "#123456" },
          });
          assert.equal(saved.id, first.id);
          assert.equal(saved.name, "Primary");
          assert.equal(saved.logo, first.logo);
          assert.equal(saved.brandColor, "#123456");
        },
      );

      await t.test(
        "foreign explicit IDs and corrupt default references never return another team's brand",
        async () => {
          await assert.rejects(
            resolveOwnedBrandId(owner.id, foreign.id),
            /Brand not found/,
          );
          await prisma.team.update({
            where: { id: owner.id },
            data: { defaultBrandId: foreign.id },
          });
          const actual = await resolveBaseBrand({
            teamId: owner.id,
            linkBrandId: foreign.id,
            select: { id: true, teamId: true },
          });
          assert.equal(actual?.id, first.id);
          assert.equal(actual?.teamId, owner.id);
          await prisma.team.update({
            where: { id: owner.id },
            data: { defaultBrandId: first.id },
          });
        },
      );

      const room = await prisma.dataroom.create({
        data: {
          teamId: owner.id,
          name: "Owned room",
          pId: `br-${suffix}`,
          brandId: first.id,
        },
      });
      const foreignRoom = await prisma.dataroom.create({
        data: {
          teamId: outsider.id,
          name: "Foreign room",
          pId: `br-foreign-${suffix}`,
        },
      });
      await t.test(
        "room custom save and inherited-brand clearing persist together",
        async () => {
          const saved = await upsertDataroomBrandAndClearInherited({
            teamId: owner.id,
            dataroomId: room.id,
            data: { logo: null, hideLogo: false, brandColor: "#654321" },
          });
          assert.equal(saved.dataroomId, room.id);
          assert.equal(saved.hideLogo, false);
          assert.equal(
            (
              await prisma.dataroom.findUniqueOrThrow({
                where: { id: room.id },
              })
            ).brandId,
            null,
          );
        },
      );
      await t.test(
        "foreign and frozen rooms reject writes without changing their stored brand",
        async () => {
          await assert.rejects(
            upsertDataroomBrandAndClearInherited({
              teamId: owner.id,
              dataroomId: foreignRoom.id,
              data: { brandColor: "#000000" },
            }),
            /not found/,
          );
          assert.equal(
            await prisma.dataroomBrand.count({
              where: { dataroomId: foreignRoom.id },
            }),
            0,
          );
          await prisma.dataroom.update({
            where: { id: room.id },
            data: { isFrozen: true },
          });
          await assert.rejects(
            upsertDataroomBrandAndClearInherited({
              teamId: owner.id,
              dataroomId: room.id,
              data: { brandColor: "#000000" },
            }),
            /frozen/,
          );
          assert.equal(
            (
              await prisma.dataroomBrand.findUniqueOrThrow({
                where: { dataroomId: room.id },
              })
            ).brandColor,
            "#654321",
          );
          await prisma.dataroom.update({
            where: { id: room.id },
            data: { isFrozen: false, brandId: first.id },
          });
        },
      );

      const link = await prisma.link.create({
        data: {
          teamId: owner.id,
          brandId: first.id,
          dataroomId: room.id,
          linkType: "DATAROOM_LINK",
          allowList: [],
          denyList: [],
        },
      });
      const foreignReference = await prisma.link.create({
        data: {
          teamId: outsider.id,
          brandId: first.id,
          allowList: [],
          denyList: [],
        },
      });
      await t.test(
        "invalid cross-team references block deletion and leave all owned rows intact",
        async () => {
          await assert.rejects(
            deleteTeamBrand(
              { teamId: owner.id, brand: first },
              prisma,
              async () => {
                assert.fail("Cache must not update after rejected deletion");
              },
            ),
            /ownership/,
          );
          assert.ok(await prisma.brand.findUnique({ where: { id: first.id } }));
          assert.equal(
            (await prisma.link.findUniqueOrThrow({ where: { id: link.id } }))
              .brandId,
            first.id,
          );
          await prisma.link.delete({ where: { id: foreignReference.id } });
        },
      );
      await t.test(
        "deletion clears owned assignments, reassigns default, and updates cache after commit",
        async () => {
          let cacheCalls = 0;
          await deleteTeamBrand(
            { teamId: owner.id, brand: first },
            prisma,
            async (teamId, next) => {
              assert.equal(teamId, owner.id);
              assert.equal(next?.id, replacement.id);
              assert.equal(
                await prisma.brand.findUnique({ where: { id: first.id } }),
                null,
              );
              assert.equal(
                (
                  await prisma.team.findUniqueOrThrow({
                    where: { id: owner.id },
                  })
                ).defaultBrandId,
                replacement.id,
              );
              cacheCalls++;
            },
          );
          assert.equal(cacheCalls, 1);
          assert.equal(
            (await prisma.link.findUniqueOrThrow({ where: { id: link.id } }))
              .brandId,
            null,
          );
          assert.equal(
            (
              await prisma.dataroom.findUniqueOrThrow({
                where: { id: room.id },
              })
            ).brandId,
            null,
          );
          assert.equal(
            (
              await prisma.brand.findUniqueOrThrow({
                where: { id: foreign.id },
              })
            ).teamId,
            outsider.id,
          );
        },
      );
    } finally {
      // IDs are captured only from this invocation's successful creates.
      await prisma.team.deleteMany({ where: { id: { in: createdTeamIds } } });
      await prisma.$disconnect();
    }
  },
);
