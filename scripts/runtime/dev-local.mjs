#!/usr/bin/env node
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { redactRuntimeLine } from "./redact.mjs";

if (process.env.ROOMLINE_LOCAL_INTEGRATION !== "1") {
  console.error("Set ROOMLINE_LOCAL_INTEGRATION=1 and configure the isolated development services first.");
  process.exit(1);
}
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", process.env.PORT ?? "3000"], {
  stdio: ["inherit", "pipe", "pipe"],
  env: { ...process.env, NODE_ENV: "development" },
});
for (const stream of [child.stdout, child.stderr]) {
  // readline buffers across chunks, so a split secret never leaks between writes.
  const lines = createInterface({ input: stream });
  lines.on("line", (line) => process.stdout.write(redactRuntimeLine(line) + "\n"));
}
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("error", () => { console.error("Could not start the local development server."); process.exitCode=1; });
child.on("exit", (code) => { process.exitCode = code ?? 1; });
