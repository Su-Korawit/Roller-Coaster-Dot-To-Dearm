---
status: accepted
---

# Roadmap import/export uses an owned versioned JSON schema, not a raw React Flow dump

Roadmap import/export serialises to our own versioned schema (`{ version, nodes, edges }`) that
is mapped to and from React Flow on the I/O boundary, rather than dumping React Flow's runtime
node objects directly. This shape is the contract a future AI roadmap generator will read and
write, and saved files outlive any single version of the editor, so it must stay stable even as
the React Flow node shape changes. We pay a small mapping cost on import/export to avoid coupling
the file format (and the AI contract) to React Flow internals.

Schema v1:

```json
{
  "version": 1,
  "nodes": [
    { "id": "...", "type": "process|condition|stageLabel|image",
      "position": { "x": 0, "y": 0 }, "data": {},
      "width": 100, "height": 32 }
  ],
  "edges": [
    { "id": "...", "source": "...", "target": "...",
      "sourceHandle": null, "targetHandle": null }
  ]
}
```

`width`/`height` are optional, emitted only for resizable nodes (stage labels). `data` carries the
per-type fields as-is: process `{label, note}`, condition `{label}`, stage label `{label}`, image
`{url, offset}`.

## Considered Options

- **Raw React Flow dump** (rejected) — zero mapping code, but couples the file format and the AI
  contract to React Flow's internal node shape; a library upgrade or swap would break old exports
  and any AI-generated roadmaps.
