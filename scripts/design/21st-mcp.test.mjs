import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { MCP_ENDPOINT, createMcpClient, main, redact } from "./21st-mcp.mjs";

const TEST_KEY = "test-only-credential";
const initialization = {
  protocolVersion: "2025-03-26",
  serverInfo: { name: "21st" },
};
const searchTool = {
  name: "search",
  description: "Search component metadata",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string" },
      type: { enum: ["component", "theme"] },
      limit: { type: "integer", maximum: 3 },
    },
    required: ["query"],
  },
};
const json = (result, id, headers = {}) =>
  new Response(JSON.stringify({ jsonrpc: "2.0", id, result }), {
    headers: { "content-type": "application/json", ...headers },
  });

function mockServer(handler) {
  const requests = [];
  return {
    requests,
    fetch: async (url, options) => {
      const body = JSON.parse(options.body);
      requests.push({ url, options, body });
      if (body.method === "initialize")
        return json(initialization, body.id, {
          "mcp-session-id": "test-session",
        });
      if (body.method === "notifications/initialized")
        return new Response(null, { status: 202 });
      return handler(body, requests);
    },
  };
}

test("missing environment key fails before any network request", async () => {
  await assert.rejects(
    main([], {}, () => {
      throw new Error("must not fetch");
    }),
    /API_KEY_21ST is not configured/,
  );
});

test("help works without credentials and credential flags are rejected", async () => {
  assert.match(await main(["--help"], {}), /Reads API_KEY_21ST only/);
  await assert.rejects(
    main(["--api-key", TEST_KEY], {}),
    /Credentials are accepted only/,
  );
});

test("MCP initializes and carries negotiated protocol/session without exposing authentication", async () => {
  const server = mockServer((body) => json({ tools: [searchTool] }, body.id));
  const output = await main([], { API_KEY_21ST: TEST_KEY }, server.fetch);
  assert.deepEqual(JSON.parse(output).tools, ["search"]);
  assert.equal(server.requests.length, 3);
  assert.equal(server.requests[0].url, MCP_ENDPOINT);
  assert.equal(server.requests[0].options.headers["x-api-key"], TEST_KEY);
  assert.equal(server.requests[0].options.redirect, "error");
  assert.equal(server.requests[1].body.method, "notifications/initialized");
  assert.equal(Object.hasOwn(server.requests[1].body, "id"), false);
  assert.equal(
    server.requests[2].options.headers["Mcp-Session-Id"],
    "test-session",
  );
  assert.equal(output.includes(TEST_KEY), false);
  assert.equal(output.includes("test-session"), false);
});

test("SSE returns after its matching response and cancels a stream that remains open", async () => {
  let cancelled = false;
  const client = createMcpClient({
    apiKey: TEST_KEY,
    timeoutMs: 100,
    fetchImpl: async () =>
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode(
                'data: {"jsonrpc":"2.0","method":"notifications/progress"}\n\ndata: {"jsonrpc":"2.0","id":1,"result":{"tools":[]}}\n\n',
              ),
            );
          },
          cancel() {
            cancelled = true;
          },
        }),
        { headers: { "content-type": "text/event-stream" } },
      ),
  });
  assert.deepEqual(await client.listTools(), []);
  assert.equal(cancelled, true);
});

test("transport and HTTP failures never return raw errors or response bodies", async () => {
  const httpClient = createMcpClient({
    apiKey: TEST_KEY,
    fetchImpl: async () => new Response(TEST_KEY, { status: 401 }),
  });
  await assert.rejects(
    httpClient.listTools(),
    (error) =>
      error.message.includes("HTTP 401") && !error.message.includes(TEST_KEY),
  );
  const brokenClient = createMcpClient({
    apiKey: TEST_KEY,
    fetchImpl: async () => {
      throw new Error(TEST_KEY);
    },
  });
  await assert.rejects(
    brokenClient.listTools(),
    (error) =>
      error.message.includes("transport failed") &&
      !error.message.includes(TEST_KEY),
  );
});

test("a stalled request is bounded even when a mock transport ignores AbortSignal", async () => {
  const client = createMcpClient({
    apiKey: TEST_KEY,
    timeoutMs: 10,
    fetchImpl: () => new Promise(() => {}),
  });
  await assert.rejects(client.listTools(), /timed out/);
});

test("malformed JSON, wrong RPC IDs and raw RPC errors fail with safe messages", async () => {
  const responses = [
    [new Response(TEST_KEY), /malformed JSON/],
    [json({ tools: [] }, 999), /invalid JSON-RPC/],
    [
      new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          error: { code: -32601, message: TEST_KEY },
        }),
      ),
      /JSON-RPC -32601/,
    ],
  ];
  for (const [response, expected] of responses) {
    const client = createMcpClient({
      apiKey: TEST_KEY,
      fetchImpl: async () => response,
    });
    await assert.rejects(
      client.listTools(),
      (error) =>
        expected.test(error.message) && !error.message.includes(TEST_KEY),
    );
  }
});

test("all tool-list pages are read and repeated cursors fail rather than loop", async () => {
  const server = mockServer((body) =>
    json(
      body.params.cursor
        ? { tools: [{ name: "second" }] }
        : { tools: [{ name: "first" }], nextCursor: "next" },
      body.id,
    ),
  );
  const client = createMcpClient({ apiKey: TEST_KEY, fetchImpl: server.fetch });
  assert.deepEqual(
    (await client.listTools()).map(({ name }) => name),
    ["first", "second"],
  );
  const repeated = createMcpClient({
    apiKey: TEST_KEY,
    fetchImpl: async (_url, options) =>
      json({ tools: [], nextCursor: "same" }, JSON.parse(options.body).id),
  });
  await assert.rejects(repeated.listTools(), /pagination did not finish/);
});

test("optional search only calls a compatible discovered metadata tool and redacts results", async () => {
  const server = mockServer((body) => {
    if (body.method === "tools/list")
      return json({ tools: [searchTool] }, body.id);
    assert.equal(body.method, "tools/call");
    assert.deepEqual(body.params, {
      name: "search",
      arguments: { query: "data room", type: "component", limit: 3 },
    });
    return json(
      {
        content: [{ type: "text", text: `result echo ${TEST_KEY}` }],
        token: TEST_KEY,
      },
      body.id,
    );
  });
  const output = await main(
    ["--search", "data room"],
    { API_KEY_21ST: ` ${TEST_KEY} ` },
    server.fetch,
  );
  assert.equal(JSON.parse(output).search.tool, "search");
  assert.equal(output.includes(TEST_KEY), false);
  assert.match(output, /\[REDACTED\]/);
});

test("search does not guess missing required arguments or call unrelated generation tools", async () => {
  const client = createMcpClient({
    apiKey: TEST_KEY,
    fetchImpl: async () => {
      throw new Error("must not fetch");
    },
  });
  await assert.rejects(
    client.searchComponents(
      [
        {
          ...searchTool,
          inputSchema: {
            ...searchTool.inputSchema,
            required: ["query", "workspaceId"],
          },
        },
      ],
      "table",
    ),
    /No compatible/,
  );
  await assert.rejects(
    client.searchComponents(
      [{ ...searchTool, name: "generate_component" }],
      "table",
    ),
    /No compatible/,
  );
  await assert.rejects(
    client.searchComponents(
      [{ ...searchTool, name: "search_and_publish_component" }],
      "table",
    ),
    /No compatible/,
  );
});

test("official get_inspiration metadata tool is supported without uploading repository context", async () => {
  const client = createMcpClient({
    apiKey: TEST_KEY,
    fetchImpl: async (_url, options) => {
      const body = JSON.parse(options.body);
      assert.equal(body.params.name, "get_inspiration");
      assert.deepEqual(body.params.arguments, {
        query: "permissions",
        type: "component",
        limit: 3,
      });
      return json({ content: [] }, body.id);
    },
  });
  await client.searchComponents(
    [{ ...searchTool, name: "get_inspiration" }],
    "permissions",
  );
});

test("tool errors are not printed and oversized responses are rejected", async () => {
  const client = createMcpClient({
    apiKey: TEST_KEY,
    fetchImpl: async (_url, options) =>
      json(
        { isError: true, content: [{ text: TEST_KEY }] },
        JSON.parse(options.body).id,
      ),
  });
  await assert.rejects(
    client.searchComponents([searchTool], "table"),
    (error) =>
      /tool reported an error/.test(error.message) &&
      !error.message.includes(TEST_KEY),
  );
  const oversized = createMcpClient({
    apiKey: TEST_KEY,
    fetchImpl: async () => new Response("x".repeat(1_048_577)),
  });
  await assert.rejects(oversized.listTools(), /size limit/);
});

test("redaction covers exact credentials, standard key names and key-like strings", () => {
  assert.deepEqual(
    redact(
      {
        authorization: "Bearer other",
        nested: [`echo ${TEST_KEY}`, "21st_sk_mock_value", "Bearer mock-value"],
      },
      TEST_KEY,
    ),
    {
      authorization: "[REDACTED]",
      nested: ["echo [REDACTED]", "[REDACTED]", "Bearer [REDACTED]"],
    },
  );
});

test("repository MCP config uses only the official endpoint and an environment placeholder", async () => {
  const config = JSON.parse(
    await readFile(new URL("../../.mcp.json", import.meta.url), "utf8"),
  );
  assert.deepEqual(config.mcpServers["21st"], {
    type: "http",
    url: MCP_ENDPOINT,
    headers: { "x-api-key": "${API_KEY_21ST}" },
  });
});
