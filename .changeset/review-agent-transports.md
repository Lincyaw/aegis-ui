---
'@lincyaw/aegis-ui': minor
'@lincyaw/console': patch
---

Make the agent runtime and its transports safe to hand to an outside agent.

Breaking:

- `AegisRuntime.waitFor` takes an `AegisWaitCondition` (a ref present or
  absent, a route, text, or a field value) instead of a JavaScript
  predicate string, which it no longer compiles. The timeout is capped at
  20 s and a timeout rejects with the new `timeout` error code.
- `AegisRuntime.search` resolves to `{ results, failedProviders }`
  instead of an array; a search provider that throws is listed in
  `failedProviders` instead of silently returning nothing.
- `AegisRuntime.dispatch` no longer takes `force`. It refuses an action
  whose `invocableBy` excludes the caller (`unavailable`), and refuses an
  agent dispatch of an action marked `confirm.danger` (`needs_confirm`).
- `AegisRuntime.toMcpTools()` and the `McpToolDefinition` type are removed.
- `listActions({ invocableBy })` keeps actions left at `'both'`.
- The built-in `aegis.navigate` action (and the `aegis_navigate` tool)
  resolves `to` from the current route as a URL path resolves and hands
  the router a path from the app's root. It refuses, with
  `invalid_params`, a URL on another origin or protocol, including
  `javascript:`, `data:` and `blob:` URLs, and a full URL outside the
  router's basename; a path that resolves to `//host` keeps one leading
  slash.
- MCP tools: `aegis_invoke` with `dryRun: true` previews the action
  instead of running it, and its `force` is gone; `aegis_snapshot` drops
  the `paths` it ignored; `aegis_wait_for` takes a `condition`;
  `aegis_search` takes only a positive integer `limit`. A failed action or
  navigation now comes back as a tool error.
- `AskOverlay` takes over the right-click menu only when an
  `<AgentChatProvider>` is above it. `AskPanel` sends through a new
  `onSend` prop (with `sending`) instead of a Send button that was always
  disabled; the overlay passes the question to the agent chat.
- `AskPanel` with `popover={false}` no longer closes on Escape or on a
  click outside it; only its close button closes an inline panel.

Added:

- `AegisRuntime.preview(id, params)`, returning the action and its
  `dryRun()` output without running it; `PreviewResult`.
- `AegisActionDescriptor.confirm`; the `ActionConfirm`,
  `AegisSearchResponse`, `AegisWaitCondition` and `WaitForOptions` types.
- A `signal` option on `dispatch` and `preview`, passed to the action as
  `ctx.signal`; the MCP bridge aborts it when its socket closes. A
  `dryRun` gets a `ctx.navigate` that does nothing.
- `AskOverlay`'s `scope` prop (`AskOverlayProps`), the element itself
  rather than a ref, so the overlay follows an element that mounts late
  or is replaced: a scoped overlay answers only inside its element, under
  its own chat, and the page's overlay leaves that element alone. Opening
  one overlay's panel closes any other overlay's panel.
- `AgentmChannelProvider` restarts the conversation from
  `initialMessages` when `channel.chatId` changes, in the same render, so
  a host switching chats no longer has to remount it with a `key`.

Fixed:

- A surface's `actionIds` (and `inspect`) now list the actions rendered
  inside it and those bound through `appliesTo.surfaceKind`.
- The MCP bridge answers on the socket a call arrived on, reports a reply
  that cannot be serialized as a tool error, aborts pending `waitFor`
  calls when its socket closes, stops retrying when the bridge refuses the
  page, resets its backoff only once a connection is accepted, gives a
  duplicated tab its own session id, and leaves the query string and
  fragment out of the URL it reports.
- The AgentM client rejects malformed frames, ignores events from a
  socket it has replaced, and `connect()` replaces the current connection;
  `AgentmChannelProvider` re-enables sending when the connection drops,
  and under React StrictMode it no longer drops the chunks of a streamed
  reply.
- `highlight` escapes ids in its selector, scrolls instantly under reduced
  motion, and returns the element's position after the scroll settles.
- `AskPanel`'s tool list picks up actions and surfaces registered after
  the panel opens. Its title uses the UI face, its field labels are no
  longer uppercase, its empty note is no longer italic, the panel takes
  `--radius-lg`, and its close button shows the focus ring.
- A bridge `tool.call` whose arguments are not an object gets an
  `invalid_params` reply instead of no reply.
- The library build no longer writes into `apps/console`; the console's
  `bundle:prepare` and `pnpm gen:mcp-tools` generate the MCP tool list.
