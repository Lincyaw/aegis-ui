---
'@lincyaw/aegis-ui': minor
'@lincyaw/console': patch
---

Fit the agent, content and code primitives on a phone, ring their focus where
it was clipped, and word and set their labels by the type rules.

Breaking:

- `AegisStrings` gained `codeEditorTabHint`, `agentmNotConnected`,
  `agentmSendFailed` and `agentmGatewayError`. A host that builds its own
  catalogue object must add them; a host that spreads `enStrings` or
  `zhCNStrings` needs no change.

Changed behaviour:

- `AgentmChannelProvider` writes its "not connected", "send failed" and
  gateway-error system messages from the catalogue, so they follow the
  host's `LocaleProvider`. The English wording changed: "The AgentM gateway
  is not connected. The message was not sent."
- An editable `CodeEditor` shows a line under the code while it has focus,
  "Tab indents. Press Esc, then Tab, to leave the editor.", and names it as
  the content's description. The line takes its height from the editor, so
  the page does not move. Read-only editors don't show it.
- A selectable `ReplayStepStrip` (with `onSelect`) gives each step at least
  a 24 px column and scrolls sideways when the run is wider than the strip,
  keeping the current step in view. A strip without `onSelect` still fits
  every step into its width.
- `ToolCallCard` is a light card in the light theme and keeps the terminal
  block in the dark theme. Its status reads "Running", "OK" or "Error" in
  the UI face at the micro role instead of an uppercase code-face word, and
  its JSON keeps its indent and scrolls instead of wrapping.
- `TrajectoryStep` labels (Thought, Action, Tool, Observation) are no longer
  uppercase; the English catalogue words them in sentence case, as it does
  the action type ("Tool call"). When a step has no `summary`, its header
  shows the first line of the Markdown `action` without its syntax, with
  inline code set in the code face, instead of raw backticks.
- `DiffViewer`'s split view keeps a two-column width and scrolls sideways in
  a narrow container instead of breaking code mid-token.
- `ContentPreview` wraps plain text and keeps its line breaks; code and JSON
  still scroll in a `CodeBlock`.
- `CommandInvocationCard` wraps its arguments instead of cutting them off.
- `FilePreview` fits an image or video, and the fallback's size label, inside
  `maxHeight`.
- `QueryAutocomplete`'s syntax help is a button: it opens on focus or a tap
  as well as on hover, and Escape closes it. The field draws the brand
  border and focus halo while its input has focus.
- `UploadQueue` rows let the meta move under a long name in a narrow queue,
  so the name shows in full instead of truncating to a few letters.
- `AskPanel` is never wider than its container when inline, nor than the
  viewport less its margin as a popover.

New API:

- `--text-warn`: caution text that must be read at small sizes, 4.5:1 on
  the page, a panel and `--bg-warn-soft`. `--ink-warn` stays for marks and
  large text.
- `--tool-call-bg`, `--tool-call-code-bg`, `--tool-call-border`,
  `--tool-call-ink`, `--tool-call-ink-muted`: the `ToolCallCard` surface in
  each theme.

Fixes:

- Focus rings that their container clipped are drawn inset: the
  `ChatMessageList` scroller, the `TrajectoryStep` head, the `CodeBlock`
  code and Copy button, `ToolCallCard`'s code, and `DiffViewer`'s fold row
  and summary button. `TraceTree`'s resize handle draws the focus ring
  instead of a hairline, and a selected row keeps its inverted surface while
  it has focus.
- `Terminal`'s warn prefix and `ChatComposer`'s disabled banner use
  `--text-warn` (3.0:1 before). `ThoughtCard`'s clock uses `--text-muted`.
- `Markdown` links use `--accent-info` and draw the focus ring.
- `ChatComposer`'s Send and `CommandInvocationCard`'s Undo take
  `--radius-pill`; Undo, `CodeBlock`'s Copy and `ChatSessionList`'s "more"
  button are 24 px targets.
- `ChatSessionList`'s delete item and confirm button use the caution tone,
  not anomaly red: deleting is a caution, not a failure.
- `Timeline` markers, meta and times, `ChatMessage` times, `FileDropzone`'s
  size limit, `FilePreview`'s fallback size and `ContentPreview`'s duplicate
  count are set in the numeric face with tabular figures instead of the code
  face.

Gallery: the ParquetViewer specimen reads a 120-row `spans.parquet` from a
URL; the upload specimens carry real file sizes; the ChatSessionList,
AskPanel and SQL CodeEditor specimens fit a phone; the TrajectoryStep
fixture's extra sections are in sentence case.
