---
'@lincyaw/aegis-ui': minor
---

`ToolCallData` and `AgentToolCallRecord` drop `isError`: `status` alone says how a call ended, and `AgentmChannelProvider` turns a call the gateway reports as `ok` with `is_error` into `status: 'error'`, so `ToolCallCard` no longer shows a failed call as ok. Pass `status: 'error'` where you passed `isError: true`.

The shell's header icon buttons, `ThemeToggle`, the `ChatComposer` send button and `SavedQueryBar` chips rise on hover and settle back when pressed, like `Button`, instead of shrinking. Agent surfaces measure their element when the runtime takes a snapshot rather than on every scroll, so primitives without a `surface` no longer re-render while the page scrolls.
