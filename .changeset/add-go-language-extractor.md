---
'@razakadam74/gitmsg': minor
---

Add Go language extractor for symbol-aware subject lines on `.go` files. Recognises top-level `func`, `type … struct`, `type … interface`, type aliases/named types, and `const` declarations, including Go 1.18+ generic type parameters. Visibility is sourced from the leading-capital convention (`Foo` exported, `foo` package-private), matching the language spec.
