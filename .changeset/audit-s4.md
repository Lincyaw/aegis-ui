---
'@lincyaw/console': patch
---

Fix the gallery defects found by the gallery audit.

- Gallery sections are framed by a hairline with no shadow, so a shadowed
  specimen is the only shadow on its layer, and each SectionDivider opens
  the specimen below it with space above.
- In-page links keep `?lang=zh-CN`.
- Specimens follow the design rules: numbers set in the numeric face, not
  mono; cautions in the caution tone; a running Tag readable in dark;
  SettingsSection built from TextField, Select and Checkbox; an EmptyState
  action that is a real button; theme-neutral token copy; Carousel titles
  as headings.
- Specimens fit their stage: ResizableSidePanel stacks at ≤768 px, the
  LineChart labels sit above the plot, the Button action column takes the
  stage width, Markdown starts at the top, Radius boxes are tall enough to
  tell the radii apart, the scroll-drawn charts show their first chart at
  rest, the cost story draws each step's own chart, and SiteLayout's skip
  link appears inside its frame.
