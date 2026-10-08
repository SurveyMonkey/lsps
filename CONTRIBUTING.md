# Contributing

## Setup

- node 22.18 or newer, pnpm (the version in `package.json` `packageManager`), and the `claude`
  CLI on `PATH`.
- `pnpm install`. It installs the pinned toolchain and the git hooks (`lefthook.yml`).

## Checks

| Command | What it checks |
| --- | --- |
| `pnpm test` | The vitest suite with coverage at 100 on all four buckets. |
| `pnpm exec tsc -p tsconfig.json` | Types, over `tests/`, `harness/`, `lib/` and each plugin. |
| `pnpm exec biome ci . --error-on-warnings` | Lint and format of `.ts` and `.json`. |
| `claude plugin validate --strict <dir>` | The marketplace manifest, and each plugin directory. |

The pre-commit hook runs the staged-only subset. CI runs everything (`ci.yml`, and
`plugin-validate.yml` from the first plugin on). The job names `vitest`, `vitest-floor`, `types`,
`biome` and `plugin-validate` are the required checks on `main`, matched by exact string. Do not
rename one.

## Layout

- `plugins/<plugin>/` ships. It holds only what the installed plugin runs. Shared code lives in
  the root `lib/`, reached through the committed symlink `plugins/<plugin>/src/lib`.
- `tests/` holds every test: `tests/plugins/<plugin>/` mirrors `plugins/<plugin>/src/`,
  `tests/lib/` and `tests/harness/` cover `lib/` and `harness/`.
- `harness/` is the shared test harness. It never ships.
- `docs/adr/` and `docs/rfc/` hold the records. `.claude/rules/` holds the rules that apply to
  each path.

## Worktrees

Issue work goes in a worktree at `.claude/worktrees/<branch>/`, which `.gitignore` covers. Run
`pnpm install` inside it; worktrees do not share `node_modules`.

## Pull requests

Conventional Commits titles. One concern per pull request. Bump a plugin's `version` in its
`plugin.json` when its files change; that string is what reaches installed users.
