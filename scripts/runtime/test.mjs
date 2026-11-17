#!/usr/bin/env node
import { spawn } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
function testsIn(directory) {
  return readdirSync(path.join(root, directory), {
    withFileTypes: true,
  }).flatMap((entry) => {
    const relative = path.posix.join(directory, entry.name);
    return entry.isDirectory()
      ? testsIn(relative)
      : /\.test\.(?:ts|tsx|mjs|cjs)$/.test(relative)
        ? [relative]
        : [];
  });
}
const files = [
  ...testsIn("lib"),
  ...testsIn("ee"),
  ...testsIn("components"),
  ...testsIn("scripts/runtime"),
].sort();
const child = spawn(
  process.execPath,
  ["--import", "tsx", "--test", "--test-concurrency=2", ...files],
  { cwd: root, stdio: "inherit", env: process.env },
);
child.on("error", () => {
  console.error("Could not start runtime tests.");
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
