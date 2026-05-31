---
'@razakadam74/gitmsg': patch
---

Infer scope from signal files when noise (tests, docs, changesets) outnumbers the real cluster. Adds a fourth rung to `detectScope`: after dropping noise files entirely, if two or more signal-bearing files survive and all share the same first path segment, that segment becomes the scope. Closes #54.
