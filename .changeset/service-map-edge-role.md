---
'@lincyaw/aegis-ui': patch
'@lincyaw/console': patch
---

ServiceMap: an edge is a `group` named `<source> to <target>` whether or
not it can be focused. Without `onEdgeClick`, React Flow gave it the role
`img`, so its role description from `serviceMapEdgeRole` had no role to
describe. The gallery's session DAG specimen, which passes no handlers,
says so.
