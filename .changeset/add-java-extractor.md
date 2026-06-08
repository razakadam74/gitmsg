---
'@razakadam74/gitmsg': minor
---

Add Java language extractor for symbol-aware subject lines on `.java` files. Recognises `class`, `interface` (incl. `@interface` annotation types), `enum`, and `record` declarations — including bounded generics (`<T extends Comparable<T>>`), `sealed`/`non-sealed`/`final`/`abstract` modifiers, package-private visibility, and inner classes. Visibility is inferred from the `public` line prefix (same model as C#). Methods, fields, constructors, and `.kt`/`.scala`/`.class`/`.jsp` files are deliberately out of scope; see [`docs/languages/java.md`](https://github.com/razakadam74/gitmsg/blob/main/docs/languages/java.md) for the full pattern ladder and blind spots.
