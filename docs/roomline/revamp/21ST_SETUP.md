# 21st.dev CLI and MCP setup

The official `@21st-dev/cli` package is installed at **version 1.18.0** in the user-owned prefix `/home/agent/.local`. The repository has a secret-free MCP configuration and a small read-only verification script. Authentication is **not complete**: `API_KEY_21ST` is absent and `21st whoami` reports that no CLI session is logged in.

Do not reuse the API key pasted into chat. Revoke that exposed value in [21st account settings](https://21st.dev/settings/api-keys), create a replacement, and supply the replacement through your environment's secret settings. No key belongs in source, `.mcp.json`, command arguments, screenshots, or this document.

## CLI

The installation used the official npm package and did not change application dependencies:

```sh
npm install --global --prefix "$HOME/.local" @21st-dev/cli@1.18.0
```

Use the executable directly, or add the user prefix to the shell path:

```sh
export PATH="$HOME/.local/bin:$PATH"
21st help
21st whoami
```

The installed release accepts `21st help`. It does not implement conventional `--version`; the installed package metadata establishes version 1.18.0. Avoid assuming subcommand `--help` is passive: `21st login --help` starts the browser login flow in this release.

For an interactive session, run `21st login` in a terminal with a browser you can control. Complete sign-in in that browser, then run `21st whoami`. The CLI saves its own session under `~/.config/21st`; this is separate from the environment variable used by the repository's verification script. The attempted login listener in this task was canceled without completing sign-in because a shared-browser handoff was not available to this agent.

Once authenticated, these commands search metadata without retrieving or installing component source:

```sh
21st search "data room dashboard" --type component --limit 5 --json
21st search "accessible sharing settings" --type component --limit 5 --json
```

`21st get` retrieves component source and is metered. `21st add` changes project files and dependencies. Neither was run for this setup. Generation is a separate paid capability; check `21st usage --json` before treating it as available.

## MCP client configuration

[.mcp.json](../../../.mcp.json) matches the official output of `21st init --client claude`:

```json
{
  "mcpServers": {
    "21st": {
      "type": "http",
      "url": "https://21st.dev/api/mcp",
      "headers": {
        "x-api-key": "${API_KEY_21ST}"
      }
    }
  }
}
```

The placeholder must be expanded by an MCP client that supports this configuration format. Set the environment secret before launching that client, then reload its MCP servers. The JSON contains no credential and does not attach new tools to an already running chat by itself.

Codex uses TOML rather than the repository `.mcp.json`. The official `21st init --client codex` prints this configuration for the user's existing `~/.codex/config.toml`:

```toml
[mcp_servers.21st]
url = "https://21st.dev/api/mcp"
bearer_token_env_var = "API_KEY_21ST"
```

Merge it without replacing unrelated servers. The CLI can print editor-specific alternatives with `21st init --client cursor`, `claude`, `codex`, `vscode`, or `devin`; `--write` mutates that client's configuration. This task created the repository `.mcp.json` only and did not overwrite a personal/global MCP configuration.

## Read-only verification script

With a rotated `API_KEY_21ST` supplied through environment secrets:

```sh
node scripts/design/21st-mcp.mjs
node scripts/design/21st-mcp.mjs --search "data room dashboard"
```

In this managed Cloud environment, Node must honor its inherited HTTP(S) proxy settings. Node 24 supports:

```sh
node --use-env-proxy scripts/design/21st-mcp.mjs
node --use-env-proxy scripts/design/21st-mcp.mjs --search "data room dashboard"
```

The script sends `initialize`, `notifications/initialized`, and paginated `tools/list` requests to the fixed official endpoint. It supports JSON and SSE responses, keeps the negotiated session in memory, bounds each request to 15 seconds and each response to 1 MiB, and refuses HTTP redirects. Output includes discovered tool names, not authentication headers or session identifiers.

Optional `--search` calls only a discovered, allowlisted metadata tool whose input schema is compatible with `query` and optional `type`/`limit`. This includes `get_inspiration`, the metadata-only tool used by the installed official CLI. The script sends the search query only and does not upload repository context. It does not guess unfamiliar required arguments, retrieve component code, generate UI, install packages, or publish anything. Tool-result output is redacted; transport, protocol, and tool errors do not print response error bodies. Credentials are accepted only from the process environment, never as script flags.

Run local mocked tests with:

```sh
node --test scripts/design/21st-mcp.test.mjs
```

## Verification recorded on 2026-11-14

- Official npm metadata and README inspected; package version, binary name, engine requirement, endpoint, and configuration format checked.
- CLI installed in the user prefix; `21st help` and editor configuration print commands completed.
- `21st whoami`: not logged in. `API_KEY_21ST`: missing. No authenticated search, component retrieval, or account-capability check was performed.
- An unauthenticated `initialize` reachability probe, using Node's inherited proxy support, received HTTP **401**. This establishes endpoint reachability and an authentication requirement, not successful authentication.
- **14 mocked tests passed**, covering initialization/session headers, JSON/SSE, pagination, missing authentication, compatible search discovery, redaction, redirects policy, timeout/error handling, oversized responses, and the secret-free config.
- The real verification script exits nonzero with a safe missing-key message before making a network request when `API_KEY_21ST` is absent.

Sources: [official npm package](https://www.npmjs.com/package/@21st-dev/cli), [21st CLI documentation](https://help.21st.dev/cli), [MCP endpoint](https://21st.dev/api/mcp), and the installed CLI's `help` / `init` output. Authentication and live tool discovery remain pending a rotated environment secret or user-completed browser login.
