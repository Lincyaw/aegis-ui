---
'@lincyaw/aegis-ui': minor
---

Breaking: `compileLuceneToSql` and its `CompileOptions`, `CompileResult` and `FieldMapping` types leave the library, which no longer depends on `@hyperdx/lucene`. Turning a search box into ClickHouse SQL is the host's business; the console keeps the compiler with the trajectories app. `tokenizeAtCursor` and `replaceTokenAtCursor`, which `QueryAutocomplete` uses, stay.

`FilePreview` reads only the first 256 KB of a text file and cancels the rest of the download, instead of downloading the whole file before cutting it.
