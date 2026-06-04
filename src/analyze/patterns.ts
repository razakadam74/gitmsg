/**
 * Patterns shared across more than one analyzer module.
 * Module-local patterns belong in their consuming module; promote here
 * only when a second module needs them, demote back when a sole consumer
 * remains.
 */
export const DEPS_PATTERN =
  /(^|\/)(package(-lock)?\.json|yarn\.lock|pnpm-lock\.yaml|requirements\.txt|Pipfile(\.lock)?|go\.(mod|sum)|Cargo\.(toml|lock)|Gemfile(\.lock)?|composer\.(json|lock))$/;

/**
 * Files that carry no category signal of their own. They should be filtered out
 * of type-classification voting so a single `.gitignore` tweak doesn't drag a
 * docs-only or src-only commit into the line-balance fallback.
 */
export const NEUTRAL_PATTERN =
  /(^|\/)(\.gitignore|\.gitattributes|\.editorconfig|\.npmignore|\.prettierignore|\.prettierrc(\.[a-z0-9]+)?)$/;
