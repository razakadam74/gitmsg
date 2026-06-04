# gitmsg demo gif — renders to docs/demo.gif
#
# Render with VHS (https://github.com/charmbracelet/vhs):
#   vhs docs/demo.tape
#
# Requires gitmsg on PATH inside the recorded shell:
#   npm i -g @razakadam74/gitmsg
#
# The recording bootstraps a throwaway git repo in a temp dir so it stays
# deterministic and leaves no fixture in the repo.

Output docs/demo.gif
Output docs/demo.mp4

Set Shell "bash"
Set FontSize 18
Set Width 1000
Set Height 480
Set Theme "Catppuccin Mocha"
Set TypingSpeed 50ms
Set Padding 20

# ─────────────────────────────────────────────────────────────────
# Scene 1 — basic feat in TypeScript
# Bootstrap throwaway repo with a new exported function.
# ─────────────────────────────────────────────────────────────────
Hide
Type@0ms `export PS1='$ '`
Enter
Type@0ms `cd $(mktemp -d) && git init -q -b main`
Enter
Type@0ms `git config user.email demo@example.com && git config user.name 'gitmsg demo'`
Enter
Type@0ms `mkdir -p src/auth`
Enter
Type@0ms `printf 'export function login(user: string, pass: string) {\n  return { token: user + pass };\n}\n' > src/auth/login.ts`
Enter
Type@0ms `git add . && clear`
Enter
Sleep 200ms
Show

Type "git status --short"
Sleep 150ms
Enter
Sleep 900ms

Type "gitmsg"
Sleep 150ms
Enter
Sleep 1600ms

Type "gitmsg --commit"
Sleep 150ms
Enter
Sleep 1500ms

# ─────────────────────────────────────────────────────────────────
# Scene 2 — breaking change in Python (removes an exported function)
# Demonstrates: breaking-change detection (`!` + BREAKING CHANGE footer)
#               + multi-language support.
# ─────────────────────────────────────────────────────────────────
Hide
Type@0ms `clear`
Enter
Type@0ms `cd $(mktemp -d) && git init -q -b main`
Enter
Type@0ms `git config user.email demo@example.com && git config user.name 'gitmsg demo'`
Enter
Type@0ms `mkdir -p api`
Enter
Type@0ms `printf 'def login(user, pwd):\n    return {"token": user + pwd}\n\ndef logout(token):\n    return True\n' > api/auth.py`
Enter
Type@0ms `git add . && git commit -q -m 'feat(api): add auth module'`
Enter
Type@0ms `printf 'def logout(token):\n    return True\n' > api/auth.py`
Enter
Type@0ms `git add . && clear`
Enter
Sleep 200ms
Show

Type "git diff --staged --stat"
Sleep 150ms
Enter
Sleep 1100ms

Type "gitmsg"
Sleep 150ms
Enter
Sleep 3500ms
