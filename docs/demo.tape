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

Set Shell "bash"
Set FontSize 18
Set Width 1000
Set Height 480
Set Theme "Catppuccin Mocha"
Set TypingSpeed 55ms
Set Padding 20

# Bootstrap a throwaway demo repo (hidden from the recording).
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
Type@0ms `clear`
Enter
Sleep 300ms
Show

Type "git status --short"
Sleep 300ms
Enter
Sleep 1500ms

Type "git add ."
Sleep 200ms
Enter
Sleep 500ms

Type "gitmsg"
Sleep 200ms
Enter
Sleep 2000ms

Type "gitmsg --commit"
Sleep 200ms
Enter
Sleep 1500ms

Type "git log -1 --oneline"
Sleep 200ms
Enter
Sleep 2500ms
