export type ChangeKind = 'add' | 'modify' | 'delete' | 'rename';

export interface FileChange {
  /** Path of the file after the change (the `b/` side of the diff). */
  path: string;
  /** Original path, present only for renames. */
  oldPath?: string;
  kind: ChangeKind;
  addedLines: string[];
  removedLines: string[];
}

export interface DiffSummary {
  files: FileChange[];
}

export type SymbolKind = 'function' | 'class' | 'const' | 'interface' | 'type' | 'method';

export interface CodeSymbol {
  kind: SymbolKind;
  name: string;
  exported: boolean;
}

export interface SymbolDelta {
  added: CodeSymbol[];
  removed: CodeSymbol[];
}

export type CommitType =
  | 'feat'
  | 'fix'
  | 'docs'
  | 'style'
  | 'refactor'
  | 'perf'
  | 'test'
  | 'build'
  | 'ci'
  | 'chore'
  | 'revert';

export interface CommitMessage {
  type: CommitType;
  /** Optional scope of the change (e.g., a specific module or component). */
  scope?: string;
  /** Short description of the change. */
  subject: string;
  /** Optional detailed description of the change. */
  body?: string;
  /** Optional description of any breaking changes introduced by this commit. */
  breaking?: string;
}

export interface GenerateOptions {
  /** Working directory. Defaults to `process.cwd()`. */
  cwd?: string;
  /** Provide a diff string directly instead of running git. Useful for tests. */
  diff?: string;
  /** Maximum subject length (default 72). */
  maxSubjectLength?: number;
}

export interface LanguageExtractor {
  /** Match files this extractor handles, e.g. /\.tsx?$/. */
  matches(path: string): boolean;
  /** Return symbols defined in the given source lines. */
  extract(lines: string[]): CodeSymbol[];
}
