---
'@razakadam74/gitmsg': minor
---

Add C# language extractor for symbol-aware subject lines on `.cs` and `.csx` files. Recognises `class`, `interface`, `struct`, `record` (incl. `record class` / `record struct`), `enum`, and `delegate` declarations — including generic delegates and generic return types. Visibility is inferred from the `public` line prefix. Methods, properties, fields, and Razor/`.csproj` files are deliberately out of scope; see [`docs/languages/cs.md`](https://github.com/razakadam74/gitmsg/blob/main/docs/languages/cs.md) for the full pattern ladder and blind spots.
