---
'@lincyaw/aegis-ui': minor
---

The build emits one file per source module (`preserveModules`), so a bundler keeps only the primitives a host imports: `import { Panel, PageWrapper }` now costs about 3 KB minified instead of 1.1 MB, and CodeMirror, the diff viewer and the flow-graph library arrive only with the primitives that use them. Entry points and `style.css` are unchanged.
