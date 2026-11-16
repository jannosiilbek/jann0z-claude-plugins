---
type: llm
focus:
  source: file
  path: view.html
weight: 1
---

The script in view.html reads a data object (from an embedded JSON block or a fetch of data.json) and builds the page by looping over its fields. The computed values (such as 89.5, 47.5 or the row count 40) may appear inside the embedded JSON data block; they must not be typed into the HTML markup or the rendering script outside that block.
