import assert from "node:assert/strict";
import test from "node:test";

import {
  RESOURCE_OPTIONS,
  scopesToEditorState,
} from "@/components/tokens/scopes";

import { GRANULAR_SCOPES, PRESET_SCOPES } from "./scopes";

test("API scopes match the token editor's supported resource actions without widening grants", () => {
  assert.deepEqual([...PRESET_SCOPES], ["apis.all", "apis.read"]);
  assert.deepEqual(
    [...GRANULAR_SCOPES].sort(),
    RESOURCE_OPTIONS.flatMap(({ resource, actions }) =>
      actions.map((action) => `${resource}.${action}`),
    ).sort(),
  );
  for (const unsupported of [
    "analytics.write",
    "visitors.write",
    "team.write",
    "*",
    "full-access",
    "documents.delete",
  ]) {
    assert.equal(
      (GRANULAR_SCOPES as readonly string[]).includes(unsupported),
      false,
    );
    assert.equal(
      (PRESET_SCOPES as readonly string[]).includes(unsupported),
      false,
    );
  }
});

test("scope allowlists cannot be mutated at runtime", () => {
  assert.equal(Reflect.set(GRANULAR_SCOPES, 0, "team.write"), false);
  assert.equal(Reflect.set(PRESET_SCOPES, 0, "*"), false);
  assert.equal(new Set(GRANULAR_SCOPES).size, GRANULAR_SCOPES.length);
});

test("restored constants preserve legacy preset display and reject unsupported editor grants", () => {
  for (const raw of [null, undefined, "", "apis.all"])
    assert.equal(scopesToEditorState(raw).preset, "all_access");
  assert.equal(scopesToEditorState("apis.read").preset, "read_only");
  const unsupported = scopesToEditorState("analytics.write team.write unknown");
  assert.equal(unsupported.preset, "restricted");
  assert.ok(
    Object.values(unsupported.resourceState).every(
      (action) => action === "none",
    ),
  );
  const granular = scopesToEditorState(
    "documents.read links.write visitors.read",
  );
  assert.equal(granular.resourceState.documents, "read");
  assert.equal(granular.resourceState.links, "write");
  assert.equal(granular.resourceState.visitors, "read");
});
