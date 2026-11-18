#!/usr/bin/env node
import { pathToFileURL } from "node:url";

export const MCP_ENDPOINT = "https://21st.dev/api/mcp";
const MAX_RESPONSE_BYTES = 1_048_576;
const DEFAULT_TIMEOUT_MS = 15_000;

export class McpError extends Error {}

/** Never print credentials, response error bodies, or transport error messages. */
export function redact(value, secret = "") {
  if (typeof value === "string") {
    return (secret ? value.split(secret).join("[REDACTED]") : value)
      .replace(/\b21st_sk_[A-Za-z0-9_-]+/g, "[REDACTED]")
      .replace(/\bBearer\s+[^\s"']+/gi, "Bearer [REDACTED]");
  }
  if (Array.isArray(value)) return value.map((item) => redact(item, secret));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        redact(key, secret),
        /api.?key|authorization|token|secret/i.test(key)
          ? "[REDACTED]"
          : redact(item, secret),
      ]),
    );
  }
  return value;
}

async function readMessage(response, id) {
  if (!response.body) throw new McpError("MCP returned an empty response.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const sse = response.headers
    .get("content-type")
    ?.includes("text/event-stream");
  let text = "";
  let received = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      received += chunk.value.byteLength;
      if (received > MAX_RESPONSE_BYTES) {
        throw new McpError("MCP response exceeded the size limit.");
      }
      text += decoder.decode(chunk.value, { stream: true });
      if (sse) {
        const events = text.split(/\r?\n\r?\n/);
        text = events.pop() ?? "";
        for (const event of events) {
          const data = event
            .split(/\r?\n/)
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.slice(5).trimStart())
            .join("\n");
          if (!data) continue;
          let message;
          try {
            message = JSON.parse(data);
          } catch {
            throw new McpError("MCP returned malformed event data.");
          }
          if (message.id === id) return message;
        }
      }
    }
    text += decoder.decode();
    if (sse)
      throw new McpError("MCP stream ended without a matching response.");
    try {
      return JSON.parse(text);
    } catch {
      throw new McpError("MCP returned malformed JSON.");
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
}

export function createMcpClient({
  apiKey,
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  if (typeof apiKey !== "string" || !apiKey.trim()) {
    throw new McpError(
      "API_KEY_21ST is not configured. Add a newly rotated key through your environment settings.",
    );
  }
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1 || timeoutMs > 60_000) {
    throw new McpError("MCP timeout must be between 1 and 60000 milliseconds.");
  }
  let nextId = 1;
  let sessionId;
  let protocolVersion = "2025-03-26";

  async function request(method, params = {}, notification = false) {
    const id = notification ? undefined : nextId++;
    const controller = new AbortController();
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new McpError("MCP request timed out."));
      }, timeoutMs);
    });
    try {
      return await Promise.race([
        timeout,
        (async () => {
          const response = await fetchImpl(MCP_ENDPOINT, {
            method: "POST",
            redirect: "error",
            signal: controller.signal,
            headers: {
              "content-type": "application/json",
              accept: "application/json, text/event-stream",
              "x-api-key": apiKey.trim(),
              "MCP-Protocol-Version": protocolVersion,
              ...(sessionId ? { "Mcp-Session-Id": sessionId } : {}),
            },
            body: JSON.stringify({
              jsonrpc: "2.0",
              ...(notification ? {} : { id }),
              method,
              params,
            }),
          });
          if (!response.ok) {
            await response.body?.cancel().catch(() => {});
            throw new McpError(
              `MCP HTTP ${response.status}. Authentication or service access was not verified.`,
            );
          }
          const returnedSessionId = response.headers.get("mcp-session-id");
          if (returnedSessionId) sessionId = returnedSessionId;
          if (notification) {
            await response.body?.cancel().catch(() => {});
            return undefined;
          }
          const message = await readMessage(response, id);
          if (message.jsonrpc !== "2.0" || message.id !== id) {
            throw new McpError("MCP returned an invalid JSON-RPC response.");
          }
          if (message.error)
            throw new McpError(
              `MCP rejected ${method} (JSON-RPC ${Number(message.error.code) || "error"}).`,
            );
          if (!Object.hasOwn(message, "result"))
            throw new McpError("MCP response did not include a result.");
          return message.result;
        })(),
      ]);
    } catch (error) {
      if (error instanceof McpError) throw error;
      throw new McpError(
        "MCP transport failed. Check connectivity and authentication; no response body was logged.",
      );
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    async initialize() {
      const result = await request("initialize", {
        protocolVersion,
        capabilities: {},
        clientInfo: { name: "roomline-design-audit", version: "1.0.0" },
      });
      if (!result?.protocolVersion)
        throw new McpError(
          "MCP initialization did not negotiate a protocol version.",
        );
      protocolVersion = result.protocolVersion;
      await request("notifications/initialized", {}, true);
      return result;
    },
    async listTools() {
      const tools = [];
      const cursors = new Set();
      let cursor;
      do {
        const page = await request("tools/list", cursor ? { cursor } : {});
        if (!Array.isArray(page?.tools))
          throw new McpError("MCP returned an invalid tools list.");
        tools.push(...page.tools);
        cursor = page.nextCursor;
        if (cursor && (cursors.has(cursor) || cursors.size >= 20)) {
          throw new McpError(
            "MCP tool pagination did not finish within the limit.",
          );
        }
        if (cursor) cursors.add(cursor);
      } while (cursor);
      return tools;
    },
    async searchComponents(tools, query) {
      const tool = tools.find((candidate) => {
        const properties = candidate.inputSchema?.properties ?? {};
        const required = candidate.inputSchema?.required ?? [];
        return (
          [
            "get_inspiration",
            "search",
            "search_components",
            "search_ui_components",
            "component_search",
          ].includes(candidate.name) &&
          properties.query?.type === "string" &&
          required.every((key) => ["query", "type", "limit"].includes(key)) &&
          (!required.includes("type") ||
            properties.type?.enum?.includes("component")) &&
          (!required.includes("limit") ||
            properties.limit?.type === "number" ||
            properties.limit?.type === "integer")
        );
      });
      if (!tool)
        throw new McpError(
          "No compatible component-search tool was discovered. Use the official 21st search command or inspect the tool schema in your MCP client.",
        );
      const properties = tool.inputSchema.properties;
      const args = { query };
      if (properties.type?.enum?.includes("component")) args.type = "component";
      if (["number", "integer"].includes(properties.limit?.type))
        args.limit = Math.min(
          properties.limit.maximum ?? 5,
          Math.max(properties.limit.minimum ?? 1, 5),
        );
      const result = await request("tools/call", {
        name: tool.name,
        arguments: args,
      });
      if (result?.isError)
        throw new McpError(
          "The MCP component-search tool reported an error. No tool error body was logged.",
        );
      return { tool: tool.name, result };
    },
  };
}

export async function main(
  argv = process.argv.slice(2),
  env = process.env,
  fetchImpl = globalThis.fetch,
) {
  if (argv.length === 1 && argv[0] === "--help") {
    return "Usage: node scripts/design/21st-mcp.mjs [--search <query>]\nReads API_KEY_21ST only from the process environment. Initializes MCP, lists tools, and optionally searches component metadata. No component code is retrieved or installed.";
  }
  if (
    argv.length &&
    !(argv.length === 2 && argv[0] === "--search" && argv[1].trim())
  ) {
    throw new McpError(
      "Use --help or --search followed by one quoted query. Credentials are accepted only through API_KEY_21ST.",
    );
  }
  const apiKey = env.API_KEY_21ST?.trim();
  const client = createMcpClient({ apiKey, fetchImpl });
  const initialized = await client.initialize();
  const tools = await client.listTools();
  const output = {
    endpoint: MCP_ENDPOINT,
    authenticated: true,
    protocolVersion: initialized.protocolVersion,
    server: initialized.serverInfo?.name ?? "21st",
    tools: tools.map(({ name }) => name),
    ...(argv.length
      ? { search: await client.searchComponents(tools, argv[1]) }
      : {}),
  };
  return JSON.stringify(redact(output, apiKey), null, 2);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main()
    .then((output) => console.log(output))
    .catch((error) => {
      console.error(
        error instanceof McpError
          ? error.message
          : "21st MCP verification failed; no diagnostic response was logged.",
      );
      process.exitCode = 1;
    });
}
