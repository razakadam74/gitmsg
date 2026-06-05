---
'@razakadam74/gitmsg': patch
---

Filter neutral config files (`.gitignore`, `.editorconfig`, `.prettierrc*`, etc.) before type classification so a single `.gitignore` tweak doesn't drag a docs- or src-only commit into the `feat: refactor module` fallback. If the entire diff is neutrals, the type is `chore`. Closes #64.
