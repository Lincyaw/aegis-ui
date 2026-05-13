# AgentM channels chat_client — local end-to-end

How to bring up a local AgentM `contrib/channels` WebSocket gateway and
exercise `AgentmChannelProvider` from the running console at
http://localhost:3323/.

The library only ships the client + React adapter; the gateway lives in
[`Lincyaw/AgentM`](https://github.com/Lincyaw/AgentM) — `contrib/channels`
on `main` since merge commit `151d912`.

## Prerequisites

- AgentM checked out at `/home/ddq/AoyangSpace/AgentM` (path is what the
  rest of this doc assumes; adjust if yours differs).
- `uv` available on `$PATH` (AgentM is uv-managed).
- `AgentM/.env` with a working LLM provider — at minimum
  `AGENTM_PROVIDER`, `AGENTM_MODEL`, and the matching key
  (`OPENAI_API_KEY` + `OPENAI_BASE_URL`, or `ANTHROPIC_API_KEY`, etc).
  The `.env.example` covers the shape.
- aegis-ui dependencies installed (`pnpm install`).

## 1. Prepare a token file

The gateway authenticates every WS peer against a bearer-token allow-list.
One token per line; blank lines and `#` comments are ignored.

```bash
mkdir -p /tmp/agentm-e2e
python3 -c "import secrets; print(secrets.token_hex(16))" \
  > /tmp/agentm-e2e/tokens
chmod 600 /tmp/agentm-e2e/tokens
```

## 2. Start the gateway

Foreground (Ctrl-C to stop) — the default `--scenario general_purpose`
runs an in-proc worker that calls your `.env`-configured LLM:

```bash
cd /home/ddq/AoyangSpace/AgentM
uv run agentm-gateway \
  --bind ws://127.0.0.1:7777/agentm \
  --bind-token-file /tmp/agentm-e2e/tokens \
  --cwd /tmp/agentm-e2e/workspace \
  --state-dir /tmp/agentm-e2e/state \
  --scenario general_purpose
```

You should see `wire server bound at ws://127.0.0.1:7777/agentm
(auth=token(1))` on stderr. For background runs, append
`> /tmp/agentm-e2e/gateway.log 2>&1 &` and `tail -f` the log.

The gateway warns `no channels enabled — gateway will idle`; that's
expected for the chat_client path because the **console itself is the
channel** (it registers as `channel=web` on hello).

## 3. Point the console at the gateway

Write `apps/console/.env.local` (gitignored). Vite picks up `VITE_*`
vars at startup, so the dev server must be (re)started **after** this
file exists:

```bash
TOKEN=$(cat /tmp/agentm-e2e/tokens)
cat > apps/console/.env.local <<EOF
VITE_AGENTM_GATEWAY_URL=ws://127.0.0.1:7777/agentm
VITE_AGENTM_TOKEN=$TOKEN
EOF

pnpm dev          # or restart the existing :3323 dev server
```

`apps/console/src/main.tsx` reads those two vars and, when both are
present, wraps `<ConsoleApp />` in `<AgentmChannelProvider channel={…}>`.
If they're absent the console renders identically to before — there's
no gateway dependency.

Sanity check that the env reached the bundle (no LLM call yet):

```bash
curl -s http://localhost:3323/src/main.tsx | grep VITE_AGENTM
```

Both vars should show up in the inlined `import.meta.env` object.

## 4. Verify in the browser

Open http://localhost:3323/.

1. **Handshake**: DevTools → Network → WS — a connection to
   `ws://127.0.0.1:7777/agentm` should establish and stay OPEN. The
   first two frames are binary; decoded they're
   `kind=hello` (client → gateway) and `kind=welcome` (gateway →
   client). The gateway log prints
   `wire peer registered as channel 'web' (peer_id=peer-…)`.
2. **Round trip**: open any page hosting `<AgentPanel>` (the gallery's
   AI dock is the simplest) and send a short message such as `回答数字 5`.
   You should see a user bubble immediately, then a single assistant
   bubble after the LLM responds. Gateway log shows
   `gateway dispatch …` → `gateway: prompting session=…` → an HTTP call
   to your LLM endpoint.
3. **Streaming**: send a prompt that produces long output, e.g.
   `写 400 字关于蓝色的散文`. The assistant bubble's text should grow
   **in place** as chunks arrive — not produce a wall of repeated,
   ever-longer copies. (This is the cumulative-vs-delta invariant; see
   `AgentmChannelProvider.tsx` `appendOutbound` and the
   `reference_agentm_channels` memory.)
4. **Reconnect**: stop the gateway (Ctrl-C). The next `send()` shows a
   system message `AgentM gateway is not connected — message not
delivered.`. Network → WS shows fresh attempts at 1 s / 2 s / 5 s /
   10 s. Bring the gateway back up; the next attempt should reach
   `welcome` and chat resumes.

## 5. Wire-only probe (no browser)

For diagnosing the protocol without involving React or Vite, the script
`/tmp/agentm-e2e/probe.mjs` (created during the initial e2e session)
opens a WS, performs the hello/welcome, sends one inbound, and prints
every received envelope plus a delta-vs-cumulative verdict for the
outbound `body.content` shape:

```bash
node /tmp/agentm-e2e/probe.mjs
```

If you ever need to recreate it, the only deps are Node ≥ 22 (built-in
`WebSocket`) and a token file at `/tmp/agentm-e2e/tokens`.

## 6. Teardown

```bash
pkill -f 'agentm-gateway --bind ws://127.0.0.1:7777' || true
rm -rf /tmp/agentm-e2e/state /tmp/agentm-e2e/workspace
# keep /tmp/agentm-e2e/tokens if you want stable creds across runs
```

The console's `.env.local` can stay — without a gateway listening it
just produces failed WS attempts in the background, no functional
breakage.

## Known protocol quirks

- **Streamed outbounds are cumulative.** Each chunk sharing a
  `stream_id` carries the full text-so-far. Replace, don't append.
- **Long streams may never set `final: true`.** Observed empirically on
  `feat/gateway-websocket` as of 2026-05-13. The provider's
  `streamMap` won't get released by `final` in that case; new
  conversations work fine because each gets a new `stream_id`, but
  a worker-side fix is the right long-term answer.
- **One-shot short replies do set `final: true`** and arrive as a
  single outbound — they hit the non-streaming branch of
  `appendOutbound`.
