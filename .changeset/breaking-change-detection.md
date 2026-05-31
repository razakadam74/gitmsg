---
'@razakadam74/gitmsg': minor
---

Detect breaking changes when a public export is removed or renamed. Adds the `!` mark to the header and a `BREAKING CHANGE:` footer. Closes #49 (rules 1 and 4 — removed export, renamed export). Removed CLI flag detection (rule 2) and signature-change detection (rule 3) are deferred to follow-up issues.
