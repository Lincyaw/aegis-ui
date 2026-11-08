---
'@lincyaw/aegis-ui': minor
'@lincyaw/console': patch
---

Add the views a spec-to-code pipeline needs to show its histories and task
graphs:

- New `CommitGraph`: commits newest first, each drawn on its track with
  edges to its parents, git-log style. A commit with two or more parents
  drawn is a merge and draws as a ring, hollow on a selected row too;
  `refs` put branch names before the title. `lanes` split the graph into
  side-by-side histories (requirement commits, runs, trunk commits) and
  `links` draw a dashed edge from a commit to one it relates to in another
  lane. With lanes, a parent in another lane is not drawn, and a commit
  whose `lane` names no lane is drawn in the first. With
  `onSelectedIdsChange` each row has a checkbox named by the commit's
  title, and `maxSelected` keeps the most recent picks. Each row tells
  assistive technology its lane and whether it is a merge. A title stays on
  one line; hovering a cut-off title shows it whole. At 640 px and below
  the lanes narrow to 56 px and cut a long lane label off, so the graph
  does not scroll sideways.
- ServiceMap: `groups` box nodes by a label, and the groups follow one
  another along `direction` in the order given, each laid out on its own.
  A group box sits under the edges and lets clicks through to them, is a
  named `group` for assistive technology, cuts a long label off, and is an
  outline in the minimap; a group may share an id with a node.
  `focusNodeId` opens the map at actual size on one node instead of
  fitting every node, fitted to the node and its direct neighbours when
  they fit and centred on the node alone when they do not; an id that is
  not on the map is ignored. `fillViewport` makes the map as tall as the
  viewport below the shell header and breadcrumb bar
  (`--service-map-viewport-height`) above 768 px; `minimap` shows or hides
  the minimap; an `active` status marks a node that is running with a
  pulsing dot (edges take every status but `active`); `ariaLabel` names
  the map.
- ServiceMap fits the view once its nodes are measured, and again when its
  shape (direction, node ids, edge endpoints, groups, node sizes) or
  `focusNodeId` changes. A new status, sublabel, badge or selection keeps
  the user's pan and zoom.
- ServiceMap nodes widen with their label up to 320 px and then wrap it,
  instead of cutting it off at 180 px. The minimap is shown by default only
  when the map is fitted whole, and the fit keeps its strip clear, so it no
  longer covers nodes; it is not shown at 768 px and below. A fit never
  zooms in past actual size, and the map can zoom out to 10 %, so a large
  map still fits whole.
- ServiceMap without `height` now fills its container and is at least
  `--service-map-min-height` tall. Before, the pane resolved to zero height
  inside a container whose height came from its content.
- Chip: `inverted` draws the chip on a `--bg-inverted` surface, such as a
  selected row: `default`, `ink` and `ghost` take the inverted ink, the
  tinted tones keep theirs.
- Checkbox: `ariaLabelledBy` names the checkbox by another element, e.g.
  its row's title.
- TraceTree: `TraceSpan.note` puts a note at the end of a row and makes it
  the row's accessible description, not part of its name; give a Chip in
  the note `inverted` while the span is selected. `TraceSpan.muted` draws
  the row in muted ink; `TraceSpan.ariaLabel` overrides the row's
  accessible name.
- FileTree: `directoryNote` replaces the file count of a directory with any
  note, computed from the files under it. Each row's note is now its
  accessible description.
- MetadataList: `wrap` wraps long values and keeps their line breaks
  instead of truncating them.
- MonoValue: `wrap` breaks the value at any character, so a long digest
  fits a narrow column.
- New token `--breadcrumb-bar-height`, the height of the shell's
  breadcrumb bar, which now sets its line height to `--type-body-line`.
- New locale string `mergeCommit`. A host that builds its own
  `AegisStrings` adds it.

The gallery has a specimen for each.
