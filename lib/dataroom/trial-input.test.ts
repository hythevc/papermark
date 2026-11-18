import assert from "node:assert/strict";
import test from "node:test";

import { trialInputSchema } from "./trial-input";

const base = {
  name: " Review room ",
  fullName: " QA Owner ",
  companyName: " QA Company ",
};
test("trial endpoint accepts both actual onboarding form contracts", () => {
  const welcome = trialInputSchema.parse({
    ...base,
    useCase: "startup-fundraising",
    companySize: "1-10",
    tools: "Email",
  });
  assert.equal(welcome.name, "Review room");
  assert.equal(welcome.useCase, "startup-fundraising");
  const modal = trialInputSchema.parse({
    ...base,
    industry: "technology",
    companySize: "1-10",
    phoneNumber: "+15555550123",
  });
  assert.equal(modal.useCase, "technology");
  assert.equal(modal.tools, "");
});
test("malformed trial form values fail before creating a workspace room", () => {
  for (const input of [
    null,
    {},
    { ...base, fullName: null },
    { ...base, name: " " },
    { ...base, tools: {} },
    { ...base, companyName: "x".repeat(161) },
  ])
    assert.equal(trialInputSchema.safeParse(input).success, false);
});
