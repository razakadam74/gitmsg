---
'@razakadam74/gitmsg': minor
---

Add Rust language extractor for symbol-aware subject lines on `.rs` files. Recognises top-level `fn`, `struct`, `enum`, `trait`, `type` aliases, and `const` declarations — including generics, `async`/`unsafe`/`const`/`extern "C"` function qualifiers, and `unsafe` auto traits. Visibility comes from the `pub` line prefix, so `pub(crate)`/`pub(super)` read as non-exported. Methods (indented inside `impl`/`trait` blocks), inline-module items, `static`, `union`, and `macro_rules!` are out of scope; see [`docs/languages/rust.md`](https://github.com/razakadam74/gitmsg/blob/main/docs/languages/rust.md) for the full pattern ladder and blind spots.
