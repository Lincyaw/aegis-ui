---
'@lincyaw/console': patch
---

Fix the gallery defects found by the gallery audit.

- Gallery sections are flat Panels (`elevation='flat'`), so a shadowed
  specimen is the only shadow on its layer, and each SectionDivider opens
  the specimen below it with space above.
- In-page links keep `?lang=zh-CN`.
- Specimens follow the design rules: numbers set in the numeric face, not
  mono; cautions in the caution tone; a running Tag readable in dark;
  SettingsSection built from TextField, Select and Checkbox; EmptyState,
  PageHeader, Toolbar, ObjectBrowser and ObjectInspector actions that are
  real Buttons with handlers, and view switches that are pressed Buttons;
  theme-neutral token copy; Carousel titles as headings.
- New specimens: antd danger Buttons in the caution tone, a CodeEditor with
  `height='auto'`, and `--text-warn` in the colour tokens. The FilePreview
  image is served from the gallery instead of placehold.co.
- Specimens fit their stage: ResizableSidePanel stacks at ≤768 px, the
  LineChart labels sit above the plot, the Button action column takes the
  stage width, Markdown starts at the top, Radius boxes are tall enough to
  tell the radii apart, the scroll-drawn charts show their first chart at
  rest, the cost story draws each step's own chart, and SiteLayout's skip
  link appears inside its frame. The upload and compact ReplayStepStrip
  specimens start at the top of their frame beside a taller neighbour.
