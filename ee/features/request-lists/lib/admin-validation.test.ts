import assert from "node:assert/strict";
import test from "node:test";

import { assignmentChanges, validateTaskTargets } from "./admin-validation";
import {
  createTaskSchema,
  taskAssignmentSchema,
  updateTaskSchema,
} from "./schemas";

test("task assignment rejects ambiguous, blank, and caller-controlled actor fields", () => {
  for (const assignment of [
    {},
    { email: "" },
    { viewerId: "viewer", email: "visitor@example.com" },
    { groupId: "group", linkId: "link" },
    { email: "visitor@example.com", userId: "actor" },
    { email: "visitor@example.com", viewerId: null },
  ]) {
    assert.equal(taskAssignmentSchema.safeParse(assignment).success, false);
  }
  assert.deepEqual(
    taskAssignmentSchema.parse({ email: "  Visitor@Example.COM  " }),
    { email: "visitor@example.com" },
  );
  for (const field of ["viewerId", "groupId", "linkId"]) {
    assert.equal(
      taskAssignmentSchema.safeParse({ [field]: "target" }).success,
      true,
    );
  }
});

test("task mutations validate status, type, dates, and normalized duplicate assignments", () => {
  assert.equal(createTaskSchema.safeParse({ title: "  " }).success, false);
  assert.equal(
    createTaskSchema.safeParse({ title: "Request", type: "UNKNOWN" }).success,
    false,
  );
  assert.equal(
    updateTaskSchema.safeParse({ taskId: "task", status: "DONE" }).success,
    false,
  );
  assert.equal(updateTaskSchema.safeParse({ taskId: "task" }).success, false);
  assert.equal(
    createTaskSchema.safeParse({ title: "Request", dueDate: "tomorrow" })
      .success,
    false,
  );
  assert.equal(
    createTaskSchema.safeParse({
      title: "Request",
      type: "TODO",
      uploadFolderId: "folder",
    }).success,
    false,
  );
  assert.equal(
    createTaskSchema.safeParse({
      title: "Request",
      assignments: [
        { email: "visitor@example.com" },
        { email: "VISITOR@example.com" },
      ],
    }).success,
    false,
  );
  assert.equal(
    createTaskSchema.safeParse({ title: "Request", teamId: "another-team" })
      .success,
    false,
  );
  assert.equal(
    createTaskSchema.parse({ title: "  Request  " }).title,
    "Request",
  );
  assert.equal(
    updateTaskSchema.safeParse({
      taskId: "task",
      status: "COMPLETED",
      assignments: [],
    }).success,
    true,
  );
  assert.equal(
    createTaskSchema.safeParse({
      title: "Files",
      type: "UPLOAD",
      uploadFolderId: "folder",
      dueDate: "2026-12-01T00:00:00.000Z",
    }).success,
    true,
  );
});

type TargetDatabase = Parameters<typeof validateTaskTargets>[0];
const scope = { teamId: "team-a", dataroomId: "room-a" };

function database(
  targets: {
    viewers?: string[];
    groups?: string[];
    links?: string[];
    folder?: string;
  } = {},
) {
  const queries: { model: string; query: unknown }[] = [];
  const findMany =
    (model: string, ids: string[] = []) =>
    async (query: unknown) => {
      queries.push({ model, query });
      return ids.map((id) => ({ id }));
    };
  return {
    queries,
    client: {
      viewer: { findMany: findMany("viewer", targets.viewers) },
      viewerGroup: { findMany: findMany("group", targets.groups) },
      link: { findMany: findMany("link", targets.links) },
      dataroomFolder: {
        findFirst: async (query: unknown) => {
          queries.push({ model: "folder", query });
          return targets.folder ? { id: targets.folder } : null;
        },
      },
    } as unknown as TargetDatabase,
  };
}

test("foreign target queries always constrain the room and owning team", async () => {
  const db = database({
    viewers: ["viewer"],
    groups: ["group"],
    links: ["link"],
    folder: "folder",
  });
  await validateTaskTargets(db.client, scope, {
    assignments: [
      { viewerId: "viewer" },
      { groupId: "group" },
      { linkId: "link" },
      { email: "pending@example.com" },
    ],
    uploadFolderId: "folder",
  });
  assert.deepEqual(db.queries, [
    {
      model: "viewer",
      query: {
        where: {
          id: { in: ["viewer"] },
          teamId: "team-a",
          OR: [
            { dataroomId: "room-a" },
            { views: { some: { dataroomId: "room-a" } } },
            {
              groups: {
                some: { group: { dataroomId: "room-a", teamId: "team-a" } },
              },
            },
          ],
        },
        select: { id: true },
      },
    },
    {
      model: "group",
      query: {
        where: { id: { in: ["group"] }, ...scope },
        select: { id: true },
      },
    },
    {
      model: "link",
      query: {
        where: {
          id: { in: ["link"] },
          ...scope,
          linkType: "DATAROOM_LINK",
          deletedAt: null,
        },
        select: { id: true },
      },
    },
    {
      model: "folder",
      query: {
        where: {
          id: "folder",
          dataroomId: "room-a",
          dataroom: { teamId: "team-a" },
        },
        select: { id: true },
      },
    },
  ]);
});

test("missing or cross-room assignees and upload folders fail before any write", async () => {
  for (const assignment of [
    { viewerId: "foreign" },
    { groupId: "foreign" },
    { linkId: "foreign" },
  ]) {
    await assert.rejects(
      validateTaskTargets(database().client, scope, {
        assignments: [assignment],
      }),
      { status: 400, message: "Every assignee must belong to this data room." },
    );
  }
  await assert.rejects(
    validateTaskTargets(database().client, scope, {
      uploadFolderId: "foreign",
    }),
    { status: 400, message: "Choose an upload destination in this data room." },
  );
});

test("email-only assignments need no unrelated viewer record, and clearing targets is valid", async () => {
  const db = database();
  await validateTaskTargets(db.client, scope, {
    assignments: [{ email: "pending@example.com" }],
  });
  await validateTaskTargets(db.client, scope, {
    assignments: [],
    uploadFolderId: null,
  });
  assert.deepEqual(db.queries, []);
});

test("replacing assignments retains unchanged rows and their notification history", () => {
  const existing = [
    {
      id: "email-row",
      viewerId: null,
      groupId: null,
      linkId: null,
      email: "visitor@example.com",
    },
    {
      id: "group-row",
      viewerId: null,
      groupId: "group",
      linkId: null,
      email: null,
    },
  ];
  assert.deepEqual(
    assignmentChanges(existing, [
      { email: "visitor@example.com" },
      { groupId: "group" },
    ]),
    { removedIds: [], additions: [] },
  );
  assert.deepEqual(
    assignmentChanges(existing, [{ groupId: "group" }, { linkId: "new-link" }]),
    { removedIds: ["email-row"], additions: [{ linkId: "new-link" }] },
  );
  assert.deepEqual(assignmentChanges(existing, []), {
    removedIds: ["email-row", "group-row"],
    additions: [],
  });
});
